import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import { deleteDocument } from '@documenso/lib/server-only/document/delete-document';

import { ZGenericSuccessResponse } from '../schema';
import { authenticatedProcedure } from '../trpc';
import {
  ZDeleteUnsignedDocumentRequestSchema,
  ZDeleteUnsignedDocumentResponseSchema,
  deleteUnsignedDocumentMeta,
} from './delete-unsigned-document.types';

export const deleteUnsignedDocumentRoute = authenticatedProcedure
  .meta(deleteUnsignedDocumentMeta)
  .input(ZDeleteUnsignedDocumentRequestSchema)
  .output(ZDeleteUnsignedDocumentResponseSchema)
  .mutation(async ({ input, ctx }) => {
    const { documentId } = input;
    const { teamId } = ctx;

    try {
      await deleteDocument({
        id: { type: 'documentId', id: documentId },
        userId: ctx.user.id,
        teamId,
        requestMetadata: ctx.metadata,
        onlyIfUnsigned: true,
      });
    } catch (error) {
      // A previous successful deletion may have lost its response. Only this
      // known server operation can acknowledge absence; an unknown route must
      // never be treated as a deleted document by the caller.
      if (
        !(
          error instanceof AppError &&
          error.code === AppErrorCode.NOT_FOUND &&
          error.message === 'Document not found'
        )
      ) {
        throw error;
      }
    }

    return ZGenericSuccessResponse;
  });
