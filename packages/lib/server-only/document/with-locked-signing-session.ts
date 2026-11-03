import { DocumentStatus, Prisma, SigningStatus } from '@prisma/client';

import { prisma } from '@documenso/prisma';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { assertRecipientNotExpired } from '../../utils/recipients';
import { assertDocumentSigningNotRevoked } from './document-signing-state';

// Token validation before a transaction is insufficient: revocation may commit
// while that request waits for a lock. Re-read signing state under the same
// envelope/recipient locks used by revocation and strict unsigned deletion.
export const withLockedSigningSession = async <T>(
  {
    envelopeId,
    recipientId,
    token,
    fieldRecipientId,
  }: { envelopeId: string; recipientId: number; token: string; fieldRecipientId?: number },
  execute: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> =>
  prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Envelope" WHERE "id" = ${envelopeId} FOR UPDATE`;
      const recipientIds = [...new Set([recipientId, fieldRecipientId ?? recipientId])];
      await tx.$queryRaw`SELECT "id" FROM "Recipient" WHERE "envelopeId" = ${envelopeId} AND "id" IN (${Prisma.join(recipientIds)}) ORDER BY "id" FOR UPDATE`;

      const envelope = await tx.envelope.findUnique({ where: { id: envelopeId } });
      const recipients = await tx.recipient.findMany({
        where: { envelopeId, id: { in: recipientIds } },
      });

      if (
        !envelope ||
        envelope.deletedAt ||
        envelope.status !== DocumentStatus.PENDING ||
        recipients.length !== recipientIds.length ||
        recipients.find((recipient) => recipient.id === recipientId)?.token !== token
      ) {
        throw new AppError(AppErrorCode.INVALID_REQUEST, {
          message: 'Document signing session is no longer available',
        });
      }

      assertDocumentSigningNotRevoked(envelope);

      for (const recipient of recipients) {
        assertRecipientNotExpired(recipient);

        if (recipient.signingStatus !== SigningStatus.NOT_SIGNED) {
          throw new AppError(AppErrorCode.INVALID_REQUEST, {
            message: 'Recipient has already completed signing',
          });
        }
      }

      return execute(tx);
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 15000 },
  );
