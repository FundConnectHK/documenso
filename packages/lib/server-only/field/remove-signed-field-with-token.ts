import { DocumentStatus, FieldType, RecipientRole, SigningStatus } from '@prisma/client';

import { DOCUMENT_AUDIT_LOG_TYPE } from '@documenso/lib/types/document-audit-logs';
import type { RequestMetadata } from '@documenso/lib/universal/extract-request-metadata';
import { createDocumentAuditLogData } from '@documenso/lib/utils/document-audit-logs';
import { assertRecipientNotExpired } from '@documenso/lib/utils/recipients';
import { prisma } from '@documenso/prisma';

import { isPISigningMetadata } from '../../utils/pi-signing-metadata';
import { withLockedSigningSession } from '../document/with-locked-signing-session';
import { clearPISigningMetadata } from './insert-pi-signing-metadata';

export type RemovedSignedFieldWithTokenOptions = {
  token: string;
  fieldId: number;
  requestMetadata?: RequestMetadata;
};

export const removeSignedFieldWithToken = async ({
  token,
  fieldId,
  requestMetadata,
}: RemovedSignedFieldWithTokenOptions) => {
  const recipient = await prisma.recipient.findFirstOrThrow({
    where: {
      token,
    },
  });

  const field = await prisma.field.findFirstOrThrow({
    where: {
      id: fieldId,
      envelopeId: recipient.envelopeId,
      recipient: {
        ...(recipient.role !== RecipientRole.ASSISTANT
          ? {
              id: recipient.id,
            }
          : {
              signingOrder: {
                gte: recipient.signingOrder ?? 0,
              },
              signingStatus: {
                not: SigningStatus.SIGNED,
              },
            }),
      },
    },
    include: {
      envelope: true,
      recipient: true,
    },
  });

  const { envelope } = field;
  if (isPISigningMetadata(envelope.externalId, field)) {
    throw new Error('PI names and dates are managed by the signing service');
  }

  if (!envelope) {
    throw new Error(`Document not found for field ${field.id}`);
  }

  if (envelope.status !== DocumentStatus.PENDING) {
    throw new Error(`Document ${envelope.id} must be pending`);
  }

  assertRecipientNotExpired(recipient);

  if (
    recipient?.signingStatus === SigningStatus.SIGNED ||
    field.recipient.signingStatus === SigningStatus.SIGNED
  ) {
    throw new Error(`Recipient ${recipient.id} has already signed`);
  }

  // Unreachable code based on the above query but we need to satisfy TypeScript
  if (field.recipientId === null) {
    throw new Error(`Field ${fieldId} has no recipientId`);
  }

  await withLockedSigningSession(
    {
      envelopeId: envelope.id,
      recipientId: recipient.id,
      fieldRecipientId: field.recipient.id,
      token,
    },
    async (tx) => {
      await tx.field.update({
        where: {
          id: field.id,
        },
        data: {
          customText: '',
          inserted: false,
        },
      });

      await tx.signature.deleteMany({
        where: {
          fieldId: field.id,
        },
      });

      if (
        isPISigningMetadata(envelope.externalId, { type: FieldType.DATE }) &&
        (field.type === FieldType.SIGNATURE || field.type === FieldType.FREE_SIGNATURE)
      ) {
        await clearPISigningMetadata(tx, field, field.recipient, requestMetadata);
      }

      if (recipient.role !== RecipientRole.ASSISTANT) {
        await tx.documentAuditLog.create({
          data: createDocumentAuditLogData({
            type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_UNINSERTED,
            envelopeId: envelope.id,
            user: {
              name: recipient.name,
              email: recipient.email,
            },
            requestMetadata,
            data: {
              field: field.type,
              fieldId: field.secondaryId,
            },
          }),
        });
      }
    },
  );
};
