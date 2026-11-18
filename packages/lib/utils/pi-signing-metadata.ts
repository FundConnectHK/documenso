import { type Field, FieldType } from '@prisma/client';

export const PI_SIGNING_TIME_ZONE = 'Asia/Hong_Kong';
export const PI_SIGNING_DATE_FORMAT = 'yyyy-MM-dd';

// service-core's fixed-PDF PI documents have this versioned server-owned ID.
// Other documents retain their existing interactive field behavior.
export const isPISigningMetadata = (
  externalId: string | null | undefined,
  field: Pick<Field, 'type'>,
) =>
  /^pi:\d+:\d+:pi-fixed-v\d+$/.test(externalId ?? '') &&
  (field.type === FieldType.DATE || field.type === FieldType.NAME);
