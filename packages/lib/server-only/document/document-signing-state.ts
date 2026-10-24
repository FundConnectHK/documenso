import type { Envelope, Prisma } from '@prisma/client';
import { DocumentStatus } from '@prisma/client';

import { AppError, AppErrorCode } from '../../errors/app-error';

export const assertDocumentSigningNotRevoked = (envelope: Pick<Envelope, 'signingRevokedAt'>) => {
  if (envelope.signingRevokedAt) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'DOCUMENT_SIGNING_REVOKED',
    });
  }
};

// Sending and resending share the same envelope lock as revocation and signing.
// Always read the marker after waiting for the lock, at READ COMMITTED isolation.
export const lockDocumentForSending = async ({
  tx,
  envelopeId,
  teamId,
  allowDraft = false,
}: {
  tx: Prisma.TransactionClient;
  envelopeId: string;
  teamId: number;
  allowDraft?: boolean;
}) => {
  await tx.$queryRaw`SELECT "id" FROM "Envelope" WHERE "id" = ${envelopeId} FOR UPDATE`;
  const envelope = await tx.envelope.findUnique({ where: { id: envelopeId } });

  if (!envelope || envelope.deletedAt) {
    throw new AppError(AppErrorCode.NOT_FOUND, { message: 'Document not found' });
  }

  if (envelope.teamId !== teamId) {
    throw new AppError(AppErrorCode.UNAUTHORIZED, { message: 'Document team has changed' });
  }

  assertDocumentSigningNotRevoked(envelope);

  if (
    envelope.status !== DocumentStatus.PENDING &&
    !(allowDraft && envelope.status === DocumentStatus.DRAFT)
  ) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Document is no longer available for sending',
    });
  }

  return envelope;
};
