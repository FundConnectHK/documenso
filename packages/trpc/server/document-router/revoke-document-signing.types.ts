import { z } from 'zod';

import { ZSuccessResponseSchema } from '../schema';
import type { TrpcRouteMeta } from '../trpc';

export const revokeDocumentSigningMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/document/revoke-signing',
    summary: 'Expire remaining signing sessions while preserving signatures and audit evidence',
    tags: ['Document'],
  },
};

export const ZRevokeDocumentSigningRequestSchema = z.object({
  documentId: z.number().int().positive(),
});

export const ZRevokeDocumentSigningResponseSchema = ZSuccessResponseSchema;
