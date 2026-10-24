import { revokeDocumentSigning } from '@documenso/lib/server-only/document/revoke-document-signing';

import { ZGenericSuccessResponse } from '../schema';
import { authenticatedProcedure } from '../trpc';
import {
  ZRevokeDocumentSigningRequestSchema,
  ZRevokeDocumentSigningResponseSchema,
  revokeDocumentSigningMeta,
} from './revoke-document-signing.types';

export const revokeDocumentSigningRoute = authenticatedProcedure
  .meta(revokeDocumentSigningMeta)
  .input(ZRevokeDocumentSigningRequestSchema)
  .output(ZRevokeDocumentSigningResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { documentId } = input;

    await revokeDocumentSigning({
      id: { type: 'documentId', id: documentId },
      userId: ctx.user.id,
      teamId: ctx.teamId,
      requestMetadata: ctx.metadata,
    });

    return ZGenericSuccessResponse;
  });
