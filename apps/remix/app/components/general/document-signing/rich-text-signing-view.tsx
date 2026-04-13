import { useMemo, useState } from 'react';

import { Trans, useLingui } from '@lingui/react/macro';
import { FieldType, RecipientRole } from '@prisma/client';
import { CheckIcon, Loader2, PenLineIcon } from 'lucide-react';

import type { TFieldSignature } from '@documenso/lib/types/field';
import type { TCheckboxFieldMeta } from '@documenso/lib/types/field-meta';
import { cn } from '@documenso/ui/lib/utils';
import { SignatureRender } from '@documenso/ui/primitives/signature-pad/signature-render';
import { useToast } from '@documenso/ui/primitives/use-toast';

import { handleSignatureFieldClick } from '~/utils/field-signing/signature-field';

import { useRequiredDocumentSigningAuthContext } from './document-signing-auth-provider';
import { useRequiredEnvelopeSigningContext } from './envelope-signing-provider';

const FIELD_PLACEHOLDER_REGEX = /\{\{field:([^}]+)\}\}/g;

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

const RichTextCheckboxGlyph = ({ isChecked }: { isChecked: boolean }) => (
  <span
    className={cn(
      'inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border align-middle',
      isChecked
        ? 'border-primary bg-primary text-primary-foreground'
        : 'border-input bg-background',
    )}
    role="img"
    aria-label={isChecked ? 'Checked' : 'Unchecked'}
  >
    {isChecked ? <CheckIcon className="h-2.5 w-2.5 stroke-[3]" /> : null}
  </span>
);

const RichTextInlineField = ({
  fieldIdOrFormId,
  envelopeItemId,
  allFields,
  onSignSignature,
}: {
  fieldIdOrFormId: string;
  envelopeItemId: string;
  allFields: FieldWithSignature[];
  onSignSignature: (field: TFieldSignature) => Promise<void>;
}) => {
  const [isSigning, setIsSigning] = useState(false);
  const { fieldIdOrFormId: parsedFieldId, optionIndex } = parseFieldPlaceholder(fieldIdOrFormId);
  const field = useMemo(() => {
    const idNum = parseInt(parsedFieldId, 10);
    return (
      allFields.find(
        (f) =>
          f.envelopeItemId === envelopeItemId &&
          (!Number.isNaN(idNum) ? f.id === idNum : String(f.id) === parsedFieldId),
      ) ?? null
    );
  }, [parsedFieldId, envelopeItemId, allFields]);

  const fieldType = coerceFieldType(field?.type);

  if (!field) {
    return (
      <span className="rounded border border-dashed px-1 text-xs text-muted-foreground">
        [field:{fieldIdOrFormId}]
      </span>
    );
  }

  if (fieldType === FieldType.CHECKBOX) {
    const meta = (field as { fieldMeta: unknown }).fieldMeta as
      | TCheckboxFieldMeta
      | null
      | undefined;
    const values = meta?.values ?? [];

    if (optionIndex !== undefined && optionIndex >= 0) {
      const option = values[optionIndex];
      const isChecked = Boolean(option?.checked);
      return <RichTextCheckboxGlyph isChecked={isChecked} />;
    }

    if (values.length > 0) {
      return (
        <span className="inline-flex flex-wrap items-center gap-1 align-middle">
          {values.map((opt, idx) => (
            <RichTextCheckboxGlyph key={opt.id ?? idx} isChecked={Boolean(opt.checked)} />
          ))}
        </span>
      );
    }

    return (
      <span className="rounded border border-dashed px-1 text-xs text-muted-foreground">
        [checkbox]
      </span>
    );
  }

  if (fieldType === FieldType.SIGNATURE) {
    const fieldWithSig = field as FieldWithSignature;
    return (
      <span className="my-1 inline-block min-w-[120px] align-middle">
        {field.inserted && fieldWithSig.signature ? (
          <span className="inline-flex h-12 items-center">
            {fieldWithSig.signature.signatureImageAsBase64 ? (
              <img
                src={fieldWithSig.signature.signatureImageAsBase64}
                alt=""
                className="max-h-10 max-w-[120px] object-contain"
              />
            ) : fieldWithSig.signature.typedSignature ? (
              <SignatureRender
                value={fieldWithSig.signature.typedSignature}
                className="h-10 max-w-[120px]"
              />
            ) : null}
          </span>
        ) : (
          <button
            type="button"
            onClick={async () => {
              setIsSigning(true);
              try {
                await onSignSignature(field as TFieldSignature);
              } finally {
                setIsSigning(false);
              }
            }}
            disabled={isSigning}
            className="inline-flex min-h-[36px] min-w-[80px] items-center justify-center gap-1 rounded border border-dashed border-border bg-muted/30 px-2 py-1 text-xs hover:bg-muted/50 disabled:opacity-50"
          >
            {isSigning ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                <PenLineIcon className="h-3 w-3" />
                <Trans>Sign</Trans>
              </>
            )}
          </button>
        )}
      </span>
    );
  }

  if (field.inserted && field.customText) {
    return <span className="rounded bg-muted/30 px-1 py-0.5 text-sm">{field.customText}</span>;
  }

  const fallbackLabel =
    fieldType ?? (typeof field.type === 'string' ? field.type : `type:${String(field.type)}`);

  return (
    <span className="rounded border border-dashed px-1 text-xs text-muted-foreground">
      [{fallbackLabel}]
    </span>
  );
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
    signature,
    setSignature,
  } = useRequiredEnvelopeSigningContext();

  const { envelope } = envelopeData;

  const allFieldsForItem = useMemo(() => {
    const fields =
      recipient.role === RecipientRole.ASSISTANT
        ? selectedAssistantRecipientFields.filter((f) => f.envelopeItemId === envelopeItemId)
        : recipientFields.filter((f) => f.envelopeItemId === envelopeItemId);
    return fields as FieldWithSignature[];
  }, [recipient.role, envelopeItemId, recipientFields, selectedAssistantRecipientFields]);

  const allSignatureFields = allFieldsForItem.filter((f) => f.type === FieldType.SIGNATURE);
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

  const segments = useMemo(() => {
    const content = richTextContent || '<p></p>';
    const parts: Array<{ type: 'html' | 'field'; value: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const re = new RegExp(FIELD_PLACEHOLDER_REGEX.source, 'g');
    while ((match = re.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'html',
          value: content.slice(lastIndex, match.index),
        });
      }
      parts.push({ type: 'field', value: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) {
      parts.push({ type: 'html', value: content.slice(lastIndex) });
    }
    if (parts.length === 0) {
      parts.push({ type: 'html', value: content });
    }
    return parts;
  }, [richTextContent]);

  const hasInlinePlaceholders = useMemo(() => {
    const re = new RegExp(FIELD_PLACEHOLDER_REGEX.source);
    return re.test(richTextContent || '');
  }, [richTextContent]);

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
      <div className="max-w-none rounded-lg border border-border bg-background p-6 text-foreground [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-input [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-input [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_tr]:border-b [&_tr]:border-input [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6">
        {hasInlinePlaceholders ? (
          segments.map((seg, i) =>
            seg.type === 'html' ? (
              <span
                key={i}
                dangerouslySetInnerHTML={{
                  __html: seg.value || '&#8203;',
                }}
              />
            ) : (
              <RichTextInlineField
                key={i}
                fieldIdOrFormId={seg.value}
                envelopeItemId={envelopeItemId}
                allFields={allFieldsForItem}
                onSignSignature={handleSignClick}
              />
            ),
          )
        ) : (
          <div dangerouslySetInnerHTML={{ __html: richTextContent || '<p></p>' }} />
        )}
      </div>

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
