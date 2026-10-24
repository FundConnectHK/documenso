import { z } from 'zod';

import { ZSuccessResponseSchema } from '../schema';
import type { TrpcRouteMeta } from '../trpc';

export const deleteUnsignedDocumentMeta: TrpcRouteMeta = {
  openapi: {
    method: 'POST',
    path: '/document/delete-unsigned',
    summary: 'Atomically delete an unsigned document without sending cancellation emails',
    tags: ['Document'],
  },
};

export const ZDeleteUnsignedDocumentRequestSchema = z.object({
  documentId: z.number().int().positive(),
});

export const ZDeleteUnsignedDocumentResponseSchema = ZSuccessResponseSchema;
