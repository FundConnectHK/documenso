import { type Field, FieldType, type Prisma, type Recipient } from '@prisma/client';
import { DateTime } from 'luxon';

import { AppError, AppErrorCode } from '../../errors/app-error';
import { DOCUMENT_AUDIT_LOG_TYPE } from '../../types/document-audit-logs';
import type { RequestMetadata } from '../../universal/extract-request-metadata';
import { createDocumentAuditLogData } from '../../utils/document-audit-logs';
import {
  PI_SIGNING_DATE_FORMAT,
  PI_SIGNING_TIME_ZONE,
  isPISigningMetadata,
} from '../../utils/pi-signing-metadata';

type InsertPISigningMetadataOptions = {
  tx: Prisma.TransactionClient;
  envelopeId: string;
  externalId: string | null;
  recipient: Pick<Recipient, 'id' | 'name' | 'email'>;
  signedAt: Date;
  signatureFieldId?: number;
  refresh?: boolean;
  requestMetadata?: RequestMetadata;
};

// Called only inside an authenticated signature/completion transaction. Never
// called from a document read, preview, generation, or invitation operation.
export const insertPISigningMetadata = async ({
  tx,
  envelopeId,
  externalId,
  recipient,
  signedAt,
  signatureFieldId,
  refresh = false,
  requestMetadata,
}: InsertPISigningMetadataOptions) => {
  if (!isPISigningMetadata(externalId, { type: FieldType.DATE })) {
    return;
  }

  await tx.documentMeta.updateMany({
    where: { envelope: { id: envelopeId } },
    data: { timezone: PI_SIGNING_TIME_ZONE, dateFormat: PI_SIGNING_DATE_FORMAT },
  });

  const fields = await tx.field.findMany({
    where: {
      envelopeId,
      recipientId: recipient.id,
      type: { in: [FieldType.DATE, FieldType.NAME, FieldType.SIGNATURE, FieldType.FREE_SIGNATURE] },
    },
    include: { signature: true },
  });
  const date = DateTime.fromJSDate(signedAt).setZone(PI_SIGNING_TIME_ZONE);
  if (!date.isValid) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Invalid signing timezone' });
  }

  const insertedFields = [];
  for (const field of fields.filter((item) => isPISigningMetadata(externalId, item))) {
    const signature = metadataSignature(field, fields);
    if (signatureFieldId !== undefined && signature.id !== signatureFieldId) continue;
    if (!signature.inserted || !signature.signature) {
      throw new AppError(AppErrorCode.UNSIGNED_FIELDS, {
        message: 'PI metadata requires its signature',
      });
    }
    const customText =
      field.type === FieldType.DATE ? date.toFormat(PI_SIGNING_DATE_FORMAT) : recipient.name;
    if (!customText) {
      throw new AppError(AppErrorCode.INVALID_REQUEST, { message: 'Signing identity is missing' });
    }
    // On completion, both dates and recorded names must agree with the
    // authoritative signing identity, including values set by a field API.
    if (field.inserted && (!refresh || field.customText === customText)) {
      continue;
    }
    await tx.field.update({ where: { id: field.id }, data: { customText, inserted: true } });
    insertedFields.push({ fieldId: field.id, fieldType: field.type, recipientId: recipient.id });
  }

  if (insertedFields.length > 0) {
    await tx.documentAuditLog.create({
      data: createDocumentAuditLogData({
        type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELDS_AUTO_INSERTED,
        envelopeId,
        user: { name: recipient.name, email: recipient.email },
        requestMetadata,
        data: { fields: insertedFields },
      }),
    });
  }
};

// Each original PI signature block has one signer on its PDF page. Continuation
// pages retain the final page coordinates. Reject ambiguous layouts explicitly.
const metadataSignature = <T extends Field>(metadata: Field, fields: T[]): T => {
  const signatures = fields.filter(
    (field) =>
      (field.type === FieldType.SIGNATURE || field.type === FieldType.FREE_SIGNATURE) &&
      field.page === metadata.page &&
      field.envelopeItemId === metadata.envelopeItemId &&
      field.recipientId === metadata.recipientId,
  );
  if (signatures.length !== 1) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'PI signature block is ambiguous',
    });
  }
  return signatures[0];
};

export const clearPISigningMetadata = async (
  tx: Prisma.TransactionClient,
  signature: Field,
  recipient: Pick<Recipient, 'id' | 'name' | 'email'>,
  requestMetadata?: RequestMetadata,
) => {
  const fields = await tx.field.findMany({
    where: { envelopeId: signature.envelopeId, recipientId: signature.recipientId },
  });
  for (const field of fields.filter(
    (item) => item.type === FieldType.DATE || item.type === FieldType.NAME,
  )) {
    if (metadataSignature(field, fields).id !== signature.id || !field.inserted) continue;
    await tx.field.update({ where: { id: field.id }, data: { inserted: false, customText: '' } });
    await tx.documentAuditLog.create({
      data: createDocumentAuditLogData({
        type: DOCUMENT_AUDIT_LOG_TYPE.DOCUMENT_FIELD_UNINSERTED,
        envelopeId: signature.envelopeId,
        user: { name: recipient.name, email: recipient.email },
        requestMetadata,
        data: { field: field.type, fieldId: field.secondaryId },
      }),
    });
  }
};
