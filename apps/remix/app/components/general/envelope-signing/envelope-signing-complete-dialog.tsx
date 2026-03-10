import { useMemo, useState } from 'react';

import { Trans, useLingui } from '@lingui/react/macro';
import { FieldType } from '@prisma/client';
import { useNavigate, useRevalidator, useSearchParams } from 'react-router';

import { useAnalytics } from '@documenso/lib/client-only/hooks/use-analytics';
import { useCurrentEnvelopeRender } from '@documenso/lib/client-only/providers/envelope-render-provider';
import { isBase64Image } from '@documenso/lib/constants/signatures';
import { AppError, AppErrorCode } from '@documenso/lib/errors/app-error';
import type { TRecipientAccessAuth } from '@documenso/lib/types/document-auth';
import { mapSecondaryIdToDocumentId } from '@documenso/lib/utils/envelope';
import { trpc } from '@documenso/trpc/react';
import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { FRIENDLY_FIELD_TYPE } from '@documenso/ui/primitives/document-flow/types';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { useEmbedSigningContext } from '~/components/embed/embed-signing-context';

import { DocumentSigningCompleteDialog } from '../document-signing/document-signing-complete-dialog';
import { useOptionalDocumentSigningReadProgress } from '../document-signing/document-signing-read-progress-provider';
import { useRequiredEnvelopeSigningContext } from '../document-signing/envelope-signing-provider';

export const EnvelopeSignerCompleteDialog = () => {
  const navigate = useNavigate();
  const analytics = useAnalytics();

  const { t } = useLingui();
  const { toast } = useToast();
  const { revalidate } = useRevalidator();

  const [searchParams] = useSearchParams();
  const [showIncompleteFieldsModal, setShowIncompleteFieldsModal] = useState(false);

  const {
    isDirectTemplate,
    envelope,
    setShowPendingFieldTooltip,
    recipientFieldsRemaining,
    recipient,
    nextRecipient,
    email,
    fullName,
  } = useRequiredEnvelopeSigningContext();

  const { currentEnvelopeItem, setCurrentEnvelopeItem } = useCurrentEnvelopeRender();
  const readProgress = useOptionalDocumentSigningReadProgress();

  const { onDocumentCompleted, onDocumentError } = useEmbedSigningContext() || {};

  const { mutateAsync: completeDocument, isPending } =
    trpc.recipient.completeDocumentWithToken.useMutation();

  const { mutateAsync: createDocumentFromDirectTemplate } =
    trpc.template.createDocumentFromDirectTemplate.useMutation();

  const handleOnNextFieldClick = () => {
    const nextField = recipientFieldsRemaining[0];

    if (!nextField) {
      setShowPendingFieldTooltip(false);
      return;
    }

    if (nextField.envelopeItemId !== currentEnvelopeItem?.id) {
      setCurrentEnvelopeItem(nextField.envelopeItemId);
    }

    const fieldTooltip = document.querySelector(`#field-tooltip`);

    if (fieldTooltip) {
      fieldTooltip.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    setShowPendingFieldTooltip(true);
  };

  const handleOnCompleteClick = async (
    nextSigner?: { name: string; email: string },
    accessAuthOptions?: TRecipientAccessAuth,
  ) => {
    try {
      await completeDocument({
        token: recipient.token,
        documentId: mapSecondaryIdToDocumentId(envelope.secondaryId),
        accessAuthOptions,
        ...(nextSigner?.email && nextSigner?.name ? { nextSigner } : {}),
      });

      analytics.capture('App: Recipient has completed signing', {
        signerId: recipient.id,
        documentId: envelope.id,
        timestamp: new Date().toISOString(),
      });

      if (onDocumentCompleted) {
        onDocumentCompleted({
          token: recipient.token,
          documentId: mapSecondaryIdToDocumentId(envelope.secondaryId),
          recipientId: recipient.id,
          envelopeId: envelope.id,
        });

        await revalidate();

        return;
      }

      if (envelope.documentMeta.redirectUrl) {
        window.location.href = envelope.documentMeta.redirectUrl;
      } else {
        await navigate(`/sign/${recipient.token}/complete`);
      }
    } catch (err) {
      const error = AppError.parseError(err);

      if (
        error.code !== AppErrorCode.UNSIGNED_FIELDS &&
        error.code !== AppErrorCode.TWO_FACTOR_AUTH_FAILED
      ) {
        toast({
          title: t`Something went wrong`,
          description: t`We were unable to submit this document at this time. Please try again later.`,
          variant: 'destructive',
        });

        onDocumentError?.();
      }

      throw err;
    }
  };

  /**
   * Direct template completion flow.
   */
  const handleDirectTemplateCompleteClick = async (
    nextSigner?: { name: string; email: string },
    accessAuthOptions?: TRecipientAccessAuth,
    recipientDetails?: { name: string; email: string },
  ) => {
    try {
      let directTemplateExternalId = searchParams?.get('externalId') || undefined;

      if (directTemplateExternalId) {
        directTemplateExternalId = decodeURIComponent(directTemplateExternalId);
      }

      if (!recipient.directToken) {
        throw new Error('Recipient direct token is required');
      }

      const { token } = await createDocumentFromDirectTemplate({
        directTemplateToken: recipient.directToken, // The direct template token is inserted into the recipient token for ease of use.
        directTemplateExternalId,
        directRecipientName: recipientDetails?.name || fullName,
        directRecipientEmail: recipientDetails?.email || email,
        templateUpdatedAt: envelope.updatedAt,
        signedFieldValues: recipient.fields.map((field) => {
          let value = field.customText;
          let isBase64 = false;

          if (field.type === FieldType.SIGNATURE && field.signature) {
            value = field.signature.signatureImageAsBase64 || field.signature.typedSignature || '';
            isBase64 = isBase64Image(value);
          }

          return {
            token: '',
            fieldId: field.id,
            value,
            isBase64,
          };
        }),
        nextSigner,
      });

      const redirectUrl = envelope.documentMeta.redirectUrl;

      if (onDocumentCompleted) {
        await navigate({
          pathname: `/embed/sign/${token}`,
          search: window.location.search,
          hash: window.location.hash,
        });

        return;
      }

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        await navigate(`/sign/${token}/complete`);
      }
    } catch (err) {
      console.log('err', err);
      toast({
        title: t`Something went wrong`,
        description: t`We were unable to submit this document at this time. Please try again later.`,
        variant: 'destructive',
      });

      onDocumentError?.();

      throw err;
    }
  };

  const directTemplatePayload = useMemo(() => {
    if (!isDirectTemplate) {
      return;
    }

    return {
      name: fullName,
      email: email,
    };
  }, [email, fullName, isDirectTemplate]);

  const isRichTextSigningMode = Boolean(currentEnvelopeItem?.richTextContent);

  const incompleteFieldLabels = useMemo(
    () =>
      recipientFieldsRemaining.map((field) => {
        const typeLabel = t(FRIENDLY_FIELD_TYPE[field.type]);
        return field.customText ? `${typeLabel} (${field.customText})` : typeLabel;
      }),
    [recipientFieldsRemaining, t],
  );

  return (
    <>
      <DocumentSigningCompleteDialog
        isSubmitting={isPending}
        directTemplatePayload={directTemplatePayload}
        onSignatureComplete={
          isDirectTemplate ? handleDirectTemplateCompleteClick : handleOnCompleteClick
        }
        documentTitle={envelope.title}
        fields={recipientFieldsRemaining}
        fieldsValidated={handleOnNextFieldClick}
        recipient={recipient}
        allowDictateNextSigner={Boolean(
          nextRecipient && envelope.documentMeta.allowDictateNextSigner,
        )}
        defaultNextSigner={
          nextRecipient ? { name: nextRecipient.name, email: nextRecipient.email } : undefined
        }
        buttonSize="sm"
        position="center"
        forceCompleteButton={isRichTextSigningMode}
        onIncompleteFieldsError={() => setShowIncompleteFieldsModal(true)}
        requireReadToBottom={Boolean(readProgress?.requiresScroll)}
        hasReadToBottom={readProgress?.hasReadToBottom ?? true}
        onReadCompleteRequired={() => {
          toast({
            title: t`提示`,
            description: t`確認前請先閱讀完合同並簽署`,
            variant: 'destructive',
          });
        }}
      />

      <Dialog open={showIncompleteFieldsModal} onOpenChange={setShowIncompleteFieldsModal}>
        <DialogContent position="center">
          <DialogHeader>
            <DialogTitle>
              <Trans>有未完成的必填欄位</Trans>
            </DialogTitle>
            <DialogDescription>
              <div className="space-y-2">
                <p>
                  <Trans>以下欄位尚未填寫：</Trans>
                </p>
                <ul className="list-inside list-disc text-sm">
                  {incompleteFieldLabels.map((label, i) => (
                    <li key={i}>{label}</li>
                  ))}
                </ul>
                <p className="pt-2 font-medium">
                  <Trans>請聯繫管理員填入</Trans>
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowIncompleteFieldsModal(false)}>
              <Trans>確定</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
