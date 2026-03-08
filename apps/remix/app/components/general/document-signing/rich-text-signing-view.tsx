import { useState } from 'react';

import { Trans, useLingui } from '@lingui/react/macro';
import { RecipientRole } from '@prisma/client';
import { Loader2, PenLineIcon } from 'lucide-react';

import type { TFieldSignature } from '@documenso/lib/types/field';
import { SignatureRender } from '@documenso/ui/primitives/signature-pad/signature-render';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { handleSignatureFieldClick } from '~/utils/field-signing/signature-field';

import { useRequiredDocumentSigningAuthContext } from './document-signing-auth-provider';
import { useRequiredEnvelopeSigningContext } from './envelope-signing-provider';

type FieldWithSignature = TFieldSignature & {
  signature?: {
    signatureImageAsBase64: string | null;
    typedSignature: string | null;
  } | null;
};

export type RichTextSigningViewProps = {
  richTextContent: string;
  envelopeItemId: string;
};

export const RichTextSigningView = ({
  richTextContent,
  envelopeItemId,
}: RichTextSigningViewProps) => {
  const { t } = useLingui();
  const { toast } = useToast();
  const [isSigning, setIsSigning] = useState(false);

  const { executeActionAuthProcedure } = useRequiredDocumentSigningAuthContext();

  const {
    envelopeData,
    recipient,
    recipientFields,
    selectedAssistantRecipientFields,
    signField: signFieldInternal,
    signature,
    setSignature,
  } = useRequiredEnvelopeSigningContext();

  const { envelope } = envelopeData;

  const allSignatureFields =
    recipient.role === RecipientRole.ASSISTANT
      ? selectedAssistantRecipientFields.filter(
          (f) => f.envelopeItemId === envelopeItemId && f.type === 'SIGNATURE',
        )
      : recipientFields.filter(
          (f) => f.envelopeItemId === envelopeItemId && f.type === 'SIGNATURE',
        );

  const signatureFields = (() => {
    const withRichTextSigningArea = allSignatureFields.filter((f) => {
      const meta = f.fieldMeta as { richTextSigningArea?: boolean } | null | undefined;
      return meta?.richTextSigningArea === true;
    });
    return withRichTextSigningArea.length > 0 ? withRichTextSigningArea : allSignatureFields;
  })();

  const signField = async (
    fieldId: number,
    payload: { type: 'SIGNATURE'; value: string | null },
    authOptions?: Parameters<typeof signFieldInternal>[2],
  ) => {
    const { inserted } = await signFieldInternal(fieldId, payload, authOptions);
    if (inserted && payload.value) {
      setSignature(payload.value);
    }
  };

  const handleSignClick = async (field: TFieldSignature) => {
    if (field.inserted) {
      return;
    }

    setIsSigning(true);

    try {
      const payload = await handleSignatureFieldClick({
        field,
        signature,
        typedSignatureEnabled: envelope.documentMeta.typedSignatureEnabled,
        uploadSignatureEnabled: envelope.documentMeta.uploadSignatureEnabled,
        drawSignatureEnabled: envelope.documentMeta.drawSignatureEnabled,
      });

      if (!payload) {
        return;
      }

      if (payload.value) {
        await executeActionAuthProcedure({
          onReauthFormSubmit: async (authOptions) => {
            await signField(field.id, payload, authOptions);
          },
          actionTarget: field.type,
        });
      } else {
        await signField(field.id, payload);
      }
    } catch (err) {
      console.error(err);
      toast({
        title: t`Error`,
        description: t`An error occurred while signing the field.`,
        variant: 'destructive',
      });
    } finally {
      setIsSigning(false);
    }
  };

  return (
    <div className="flex w-full max-w-3xl flex-col">
      <div
        className="max-w-none rounded-lg border border-border bg-background p-6 text-foreground [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: richTextContent || '<p></p>' }}
      />

      <div className="mt-6 space-y-4">
        {signatureFields.map((field) => {
          const fieldWithSignature = field as FieldWithSignature;
          return (
            <div
              key={field.id}
              className="flex min-h-[120px] flex-col rounded-lg border border-border bg-muted/30 p-4"
            >
              <div className="mb-2 text-xs text-muted-foreground">
                <Trans>Signature</Trans>
              </div>
              {field.inserted && fieldWithSignature.signature ? (
                <div className="flex h-24 w-full items-center justify-center">
                  {fieldWithSignature.signature.signatureImageAsBase64 ? (
                    <img
                      src={fieldWithSignature.signature.signatureImageAsBase64}
                      alt=""
                      className="max-h-20 max-w-full object-contain"
                    />
                  ) : fieldWithSignature.signature.typedSignature ? (
                    <SignatureRender
                      value={fieldWithSignature.signature.typedSignature}
                      className="h-20 w-full"
                    />
                  ) : null}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={async () => handleSignClick(fieldWithSignature as TFieldSignature)}
                  disabled={isSigning}
                  className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSigning ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <PenLineIcon className="h-6 w-6" />
                      <span className="text-xs">
                        <Trans>Click to sign</Trans>
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
