import { useCallback, useMemo, useState } from 'react';

import { Trans, useLingui } from '@lingui/react/macro';
import { FieldType, RecipientRole } from '@prisma/client';
import { Loader2, PenLineIcon } from 'lucide-react';

import type { TFieldSignature } from '@documenso/lib/types/field';
import type { TCheckboxFieldMeta } from '@documenso/lib/types/field-meta';
import { FRIENDLY_FIELD_TYPE } from '@documenso/ui/primitives/document-flow/types';
import { SignatureRender } from '@documenso/ui/primitives/signature-pad/signature-render';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { handleSignatureFieldClick } from '~/utils/field-signing/signature-field';

import { useRequiredDocumentSigningAuthContext } from './document-signing-auth-provider';
import { useRequiredEnvelopeSigningContext } from './envelope-signing-provider';

const FIELD_PLACEHOLDER_REGEX = /\{\{field:([^}]+)\}\}/g;
const RICH_TEXT_SIGN_FIELD_ATTR = 'data-rich-text-sign-field';

/**
 * Prisma `FieldType` enum declaration order — matches serialized numeric indices
 * when loader/transformer exposes enum as a number instead of a string label.
 */
const FIELD_TYPE_ENUM_ORDER: readonly FieldType[] = [
  FieldType.SIGNATURE,
  FieldType.FREE_SIGNATURE,
  FieldType.INITIALS,
  FieldType.NAME,
  FieldType.EMAIL,
  FieldType.DATE,
  FieldType.TEXT,
  FieldType.NUMBER,
  FieldType.RADIO,
  FieldType.CHECKBOX,
  FieldType.DROPDOWN,
] as const;

const coerceFieldType = (type: unknown): FieldType | undefined => {
  if (typeof type === 'string' && (FIELD_TYPE_ENUM_ORDER as readonly string[]).includes(type)) {
    return type as FieldType;
  }

  if (typeof type === 'number' && Number.isInteger(type)) {
    return FIELD_TYPE_ENUM_ORDER[type];
  }

  return undefined;
};

type FieldWithSignature = TFieldSignature & {
  recipientId: number;
  secondaryId?: string;
  signature?: {
    signatureImageAsBase64: string | null;
    typedSignature: string | null;
  } | null;
};

export type RichTextSigningViewProps = {
  richTextContent: string;
  envelopeItemId: string;
};

const parseFieldPlaceholder = (value: string) => {
  const colonIndex = value.indexOf(':');
  if (colonIndex >= 0) {
    const fieldIdPart = value.slice(0, colonIndex);
    const optionIndex = parseInt(value.slice(colonIndex + 1), 10);
    return {
      fieldIdOrFormId: fieldIdPart,
      optionIndex: Number.isNaN(optionIndex) ? undefined : optionIndex,
    };
  }
  return { fieldIdOrFormId: value, optionIndex: undefined };
};

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const findFieldByPlaceholder = (
  fieldIdOrFormId: string,
  envelopeItemId: string,
  allFields: FieldWithSignature[],
) => {
  const { fieldIdOrFormId: parsedFieldId } = parseFieldPlaceholder(fieldIdOrFormId);
  const idNum = parseInt(parsedFieldId, 10);

  return (
    allFields.find(
      (f) =>
        f.envelopeItemId === envelopeItemId &&
        (!Number.isNaN(idNum)
          ? f.id === idNum
          : f.secondaryId === parsedFieldId || String(f.id) === parsedFieldId),
    ) ?? null
  );
};

const renderInlineFieldPlaceholder = (label: string) =>
  `<span class="my-0 inline align-middle rounded border border-dashed px-1 text-xs text-muted-foreground">[${escapeHtml(label)}]</span>`;

const renderCheckboxGlyphHtml = (isChecked: boolean) => {
  const symbol = isChecked ? '&#9745;' : '&#9744;';
  const title = isChecked ? 'Checked' : 'Unchecked';
  return `<span class="my-0 inline align-middle text-base text-muted-foreground" title="${title}">${symbol}</span>`;
};

type RenderFieldHtmlOptions = {
  field: FieldWithSignature | null;
  fieldIdOrFormId: string;
  optionIndex?: number;
  fieldLabel: string;
  canSign: boolean;
  isSigning: boolean;
  signLabel: string;
};

const renderFieldToHtml = ({
  field,
  fieldIdOrFormId,
  optionIndex,
  fieldLabel,
  canSign,
  isSigning,
  signLabel,
}: RenderFieldHtmlOptions) => {
  if (!field) {
    return renderInlineFieldPlaceholder(`field:${fieldIdOrFormId}`);
  }

  const fieldType = coerceFieldType(field.type);

  if (fieldType === FieldType.CHECKBOX) {
    const meta = (field as { fieldMeta: unknown }).fieldMeta as
      | TCheckboxFieldMeta
      | null
      | undefined;
    const values = meta?.values ?? [];

    if (optionIndex !== undefined && optionIndex >= 0) {
      const option = values[optionIndex];
      return renderCheckboxGlyphHtml(Boolean(option?.checked));
    }

    if (values.length > 0) {
      return values
        .map((opt, idx) => renderCheckboxGlyphHtml(Boolean(opt.checked ?? values[idx]?.checked)))
        .join('');
    }

    return renderInlineFieldPlaceholder(fieldLabel);
  }

  if (fieldType === FieldType.SIGNATURE || fieldType === FieldType.FREE_SIGNATURE) {
    if (field.inserted && field.signature) {
      if (field.signature.signatureImageAsBase64) {
        return `<span class="my-0 inline align-middle"><img src="${field.signature.signatureImageAsBase64}" alt="" class="inline max-h-10 max-w-[120px] align-middle object-contain" /></span>`;
      }

      if (field.signature.typedSignature) {
        return `<span class="my-0 inline align-middle rounded bg-muted/30 px-1 py-0.5 text-sm italic">${escapeHtml(field.signature.typedSignature)}</span>`;
      }
    }

    if (!canSign) {
      return renderInlineFieldPlaceholder('Signature');
    }

    if (isSigning) {
      return `<button type="button" ${RICH_TEXT_SIGN_FIELD_ATTR}="${field.id}" class="my-0 inline-flex min-h-[28px] min-w-[72px] items-center justify-center gap-1 rounded border border-dashed border-border bg-muted/30 px-2 py-0.5 align-middle text-xs" disabled><span class="inline-block h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span></button>`;
    }

    return `<button type="button" ${RICH_TEXT_SIGN_FIELD_ATTR}="${field.id}" class="my-0 inline-flex min-h-[28px] min-w-[72px] cursor-pointer items-center justify-center gap-1 rounded border border-dashed border-border bg-muted/30 px-2 py-0.5 align-middle text-xs hover:bg-muted/50">✎ ${escapeHtml(signLabel)}</button>`;
  }

  if (field.inserted && field.customText) {
    return `<span class="my-0 inline align-middle rounded bg-muted/30 px-1 py-0.5 text-sm">${escapeHtml(field.customText)}</span>`;
  }

  const meta = field.fieldMeta as { label?: string } | null | undefined;
  const displayLabel = meta?.label?.trim() || field.customText?.trim() || fieldLabel;

  return renderInlineFieldPlaceholder(displayLabel);
};

export const RichTextSigningView = ({
  richTextContent,
  envelopeItemId,
}: RichTextSigningViewProps) => {
  const { t } = useLingui();
  const { toast } = useToast();
  const [signingFieldId, setSigningFieldId] = useState<number | null>(null);

  const { executeActionAuthProcedure } = useRequiredDocumentSigningAuthContext();

  const {
    envelopeData,
    recipient,
    recipientFields,
    selectedAssistantRecipientFields,
    signField: signFieldInternal,
    setSignature,
  } = useRequiredEnvelopeSigningContext();

  const { envelope } = envelopeData;

  const allFieldsForItem = useMemo(() => {
    return envelope.recipients
      .flatMap((envelopeRecipient) => envelopeRecipient.fields)
      .filter((field) => field.envelopeItemId === envelopeItemId) as FieldWithSignature[];
  }, [envelope.recipients, envelopeItemId]);

  const recipientFieldsForItem = useMemo(() => {
    const fields =
      recipient.role === RecipientRole.ASSISTANT
        ? selectedAssistantRecipientFields.filter((f) => f.envelopeItemId === envelopeItemId)
        : recipientFields.filter((f) => f.envelopeItemId === envelopeItemId);
    return fields as FieldWithSignature[];
  }, [recipient.role, envelopeItemId, recipientFields, selectedAssistantRecipientFields]);

  const canSignField = useCallback(
    (field: FieldWithSignature) => {
      if (recipient.role === RecipientRole.ASSISTANT) {
        return selectedAssistantRecipientFields.some((f) => f.id === field.id);
      }

      return field.recipientId === recipient.id;
    },
    [recipient.role, recipient.id, selectedAssistantRecipientFields],
  );

  const allSignatureFields = recipientFieldsForItem.filter((f) => f.type === FieldType.SIGNATURE);
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
    setSigningFieldId(field.id);
    try {
      const payload = await handleSignatureFieldClick({
        field,
        typedSignatureEnabled: envelope.documentMeta?.typedSignatureEnabled ?? true,
        uploadSignatureEnabled: envelope.documentMeta?.uploadSignatureEnabled ?? true,
        drawSignatureEnabled: envelope.documentMeta?.drawSignatureEnabled ?? true,
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
      setSigningFieldId(null);
    }
  };

  const signLabel = t`Sign`;

  const htmlWithInlineFields = useMemo(() => {
    const content = richTextContent || '<p></p>';

    if (!new RegExp(FIELD_PLACEHOLDER_REGEX.source).test(content)) {
      return content;
    }

    return content.replace(
      new RegExp(FIELD_PLACEHOLDER_REGEX.source, 'g'),
      (_, fieldIdOrFormId) => {
        const { fieldIdOrFormId: parsedFieldId, optionIndex } =
          parseFieldPlaceholder(fieldIdOrFormId);
        const field = findFieldByPlaceholder(parsedFieldId, envelopeItemId, allFieldsForItem);
        const fieldType = coerceFieldType(field?.type);
        const fieldLabel = fieldType ? t(FRIENDLY_FIELD_TYPE[fieldType]) : parsedFieldId;

        return renderFieldToHtml({
          field,
          fieldIdOrFormId,
          optionIndex,
          fieldLabel,
          canSign: field ? canSignField(field) : false,
          isSigning: field ? signingFieldId === field.id : false,
          signLabel,
        });
      },
    );
  }, [
    richTextContent,
    envelopeItemId,
    allFieldsForItem,
    canSignField,
    signingFieldId,
    signLabel,
    t,
  ]);

  const handleRichTextContentClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = (event.target as HTMLElement).closest(`[${RICH_TEXT_SIGN_FIELD_ATTR}]`);

    if (!target) {
      return;
    }

    const fieldId = Number(target.getAttribute(RICH_TEXT_SIGN_FIELD_ATTR));

    if (Number.isNaN(fieldId)) {
      return;
    }

    const field = allFieldsForItem.find((f) => f.id === fieldId);

    if (!field || !canSignField(field)) {
      return;
    }

    void handleSignClick(field as TFieldSignature);
  };

  const signatureFieldsNeedingBar = useMemo(() => {
    const content = richTextContent || '';
    return signatureFields.filter((f) => {
      const byId = content.includes(`{{field:${f.id}}}`);
      const bySecondaryId =
        'secondaryId' in f && typeof f.secondaryId === 'string'
          ? content.includes(`{{field:${f.secondaryId}}}`)
          : false;
      return !byId && !bySecondaryId;
    });
  }, [richTextContent, signatureFields]);

  return (
    <div className="flex w-full max-w-3xl flex-col pb-32 lg:pb-0">
      <div
        className="max-w-none rounded-lg border border-border bg-background p-6 text-foreground [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-input [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-input [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_tr]:border-b [&_tr]:border-input [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6"
        dangerouslySetInnerHTML={{ __html: htmlWithInlineFields }}
        onClick={handleRichTextContentClick}
      />

      {signatureFieldsNeedingBar.length > 0 && (
        <div className="mt-6 space-y-4">
          {signatureFieldsNeedingBar.map((field) => {
            const fieldWithSignature = field as FieldWithSignature;
            const isFieldSigning = signingFieldId === field.id;
            return (
              <div
                key={field.id}
                className="relative flex min-h-[120px] flex-col rounded-lg border border-border bg-white p-4"
              >
                {isFieldSigning && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/80">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="mb-2 text-xs text-muted-foreground">
                  {(
                    field.fieldMeta as { richTextSigningAreaLabel?: string } | null
                  )?.richTextSigningAreaLabel?.trim() ||
                    field.customText?.trim() ||
                    t`Signature`}
                </div>
                {field.inserted && fieldWithSignature.signature ? (
                  <button
                    type="button"
                    onClick={async () => handleSignClick(fieldWithSignature as TFieldSignature)}
                    disabled={isFieldSigning}
                    className="flex h-24 w-full items-center justify-center rounded-md border border-transparent transition-colors hover:border-border hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-50"
                    title={t`Click to remove signature`}
                  >
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
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={async () => handleSignClick(fieldWithSignature as TFieldSignature)}
                    disabled={isFieldSigning}
                    className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-white transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isFieldSigning ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      <PenLineIcon className="h-6 w-6" />
                    )}
                    <span className="text-xs">
                      <Trans>點擊此處簽名</Trans>
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
