import { EnvelopeType, Prisma, RecipientRole, SigningStatus } from '@prisma/client';

import { prisma } from '@documenso/prisma';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { DOCUMENT_AUDIT_LOG_TYPE } from '../../types/document-audit-logs';
import type { ApiRequestMetadata } from '../../universal/extract-request-metadata';
import { createDocumentAuditLogData } from '../../utils/document-audit-logs';
import { type EnvelopeIdOptions, unsafeBuildEnvelopeIdQuery } from '../../utils/envelope';
import { getMemberRoles } from '../team/get-member-roles';

export const revokeDocumentSigning = async ({
  id,
  userId,
  teamId,
  requestMetadata,
}: {
  id: EnvelopeIdOptions;
  userId: number;
  teamId: number;
  requestMetadata: ApiRequestMetadata;
}) => {
  const envelope = await prisma.envelope.findUnique({
    where: unsafeBuildEnvelopeIdQuery(id, EnvelopeType.DOCUMENT),
  });

  // A previous successful request may have lost its response, or the unsigned
  // document may have been deleted by its owner. The operation is idempotent.
  if (!envelope) {
    return;
  }

  if (envelope.teamId !== teamId) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, { message: 'Document belongs to another team' });
  }

  if (envelope.userId !== userId) {
    await getMemberRoles({ teamId, reference: { type: 'User', id: userId } });
  }

  await prisma.$transaction(
    async (tx) => {
      // Signing mutations acquire these same locks before checking expiry.
      // A signature committed first is preserved; a later mutation is rejected.
      await tx.$queryRaw`SELECT "id" FROM "Envelope" WHERE "id" = ${envelope.id} FOR UPDATE`;
      await tx.$queryRaw`SELECT "id" FROM "Recipient" WHERE "envelopeId" = ${envelope.id} ORDER BY "id" FOR UPDATE`;
      const current = await tx.envelope.findUnique({
        where: { id: envelope.id },
        include: { recipients: true },
      });

      if (!current) {
        return;
      }

      if (current.teamId !== teamId) {
        throw new AppError(AppErrorCode.UNAUTHORIZED, { message: 'Document team has changed' });
      }

      const now = new Date();
      // Persist revocation even when all remaining recipients already expired.
      // Their ordinary expiresAt can be extended by reminders; this marker cannot.
      if (!current.signingRevokedAt) {
        await tx.envelope.update({
          where: { id: current.id },
          data: { signingRevokedAt: now },
        });
      }
      const recipients = current.recipients.filter(
        (recipient) =>
          recipient.role !== RecipientRole.CC &&
          recipient.signingStatus === SigningStatus.NOT_SIGNED &&
          (!recipient.expiresAt || recipient.expiresAt > now),
      );

      if (recipients.length === 0) {
        return;
      }

      await tx.recipient.updateMany({
        where: { id: { in: recipients.map((recipient) => recipient.id) } },
        data: { expiresAt: now, expirationNotifiedAt: now },
      });
      await tx.documentAuditLog.createMany({
        data: recipients.map((recipient) =>
          createDocumentAuditLogData({
            envelopeId: current.id,
            type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_RECIPIENT_EXPIRED,
            metadata: requestMetadata,
            data: {
              recipientId: recipient.id,
              recipientName: recipient.name,
              recipientEmail: recipient.email,
            },
          }),
        ),
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 },
  );
};
