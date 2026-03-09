import { useCallback, useMemo, useRef, useState } from 'react';

import { Trans, useLingui } from '@lingui/react/macro';
import { Link } from 'react-router';
import { EyeIcon, PencilIcon } from 'lucide-react';

import {
  useCurrentEnvelopeEditor,
  useDebounceFunction,
} from '@documenso/lib/client-only/providers/envelope-editor-provider';
import { canEnvelopeItemsBeModified } from '@documenso/lib/utils/envelope';
import { trpc } from '@documenso/trpc/react';
import type { RichTextEditorRef } from '@documenso/ui/components/rich-text-editor/rich-text-editor';
import { RichTextEditor } from '@documenso/ui/components/rich-text-editor/rich-text-editor';
import { Button } from '@documenso/ui/primitives/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@documenso/ui/primitives/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@documenso/ui/primitives/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@documenso/ui/primitives/tabs';
import { FRIENDLY_FIELD_TYPE } from '@documenso/ui/primitives/document-flow/types';
import type { FieldType } from '@prisma/client';
import type { TCheckboxFieldMeta } from '@documenso/lib/types/field-meta';

import type { TLocalField } from '@documenso/lib/client-only/hooks/use-editor-fields';

const FIELD_PLACEHOLDER_PREFIX = '{{field:';
const FIELD_PLACEHOLDER_SUFFIX = '}}';
const FIELD_PLACEHOLDER_REGEX = /\{\{field:([^}]+)\}\}/g;

const RichTextPreview = ({
  richTextContent,
  fieldsForItem,
  i18n,
}: {
  richTextContent: string;
  fieldsForItem: TLocalField[];
  i18n: { _(msg: unknown): string };
}) => {
  const htmlWithInlinePlaceholders = useMemo(() => {
    const content = richTextContent || '<p></p>';
    if (!new RegExp(FIELD_PLACEHOLDER_REGEX.source).test(content)) {
      return content;
    }
    const getField = (fieldIdOrFormId: string) => {
      const colonIndex = fieldIdOrFormId.indexOf(':');
      const fieldIdPart = colonIndex >= 0 ? fieldIdOrFormId.slice(0, colonIndex) : fieldIdOrFormId;
      const optionIndex =
        colonIndex >= 0 ? parseInt(fieldIdOrFormId.slice(colonIndex + 1), 10) : undefined;
      const idNum = parseInt(fieldIdPart, 10);
      const field = fieldsForItem.find(
        (f) =>
          (!Number.isNaN(idNum) ? f.id === idNum : String(f.id) === fieldIdPart) ||
          f.formId === fieldIdPart,
      );
      return { field, optionIndex: Number.isNaN(optionIndex ?? NaN) ? undefined : optionIndex };
    };
    return content.replace(
      new RegExp(FIELD_PLACEHOLDER_REGEX.source, 'g'),
      (_, fieldId) => {
        const { field, optionIndex } = getField(fieldId);
        if (
          field?.type === 'CHECKBOX' &&
          optionIndex !== undefined &&
          optionIndex >= 0
        ) {
          const meta = field.fieldMeta as TCheckboxFieldMeta | null | undefined;
          const values = meta?.values ?? [];
          const option = values[optionIndex];
          const isChecked = option?.checked ?? false;
          const symbol = isChecked ? '&#9745;' : '&#9744;';
          const title = isChecked ? 'Checked' : 'Unchecked';
          return `<span class="my-0 inline align-middle text-base" style="color:var(--muted-foreground)" title="${title}">${symbol}</span>`;
        }
        const label = field ? i18n._(FRIENDLY_FIELD_TYPE[field.type]) : `field:${fieldId}`;
        const escaped = label
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
        return `<span class="text-muted-foreground my-0 inline rounded border border-dashed px-1.5 py-0.5 align-middle text-xs">[${escaped}]</span>`;
      },
    );
  }, [richTextContent, fieldsForItem, i18n]);

  return (
    <div className="max-w-none rounded-lg border border-border bg-background p-6 text-foreground [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_h3]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-muted [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_table]:border-collapse [&_table]:w-full [&_td]:border [&_td]:border-input [&_td]:px-3 [&_td]:py-2 [&_th]:border [&_th]:border-input [&_th]:bg-muted/50 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium [&_tr]:border-b [&_tr]:border-input [&_u]:underline [&_ul]:list-disc [&_ul]:pl-6">
      <div dangerouslySetInnerHTML={{ __html: htmlWithInlinePlaceholders }} />
    </div>
  );
};

export const EnvelopeEditorRichTextPage = () => {
  const { t, i18n } = useLingui();
  const { envelope, setLocalEnvelope, relativePath, editorFields } = useCurrentEnvelopeEditor();

  const editorRefs = useRef<Map<string, RichTextEditorRef>>(new Map());

  const { mutateAsync: updateEnvelopeItems } = trpc.envelope.item.updateMany.useMutation({
    onSuccess: ({ data }) => {
      setLocalEnvelope({
        envelopeItems: envelope.envelopeItems.map((originalItem) => {
          const updatedItem = data.find((item) => item.id === originalItem.id);
          if (updatedItem) {
            return { ...originalItem, ...updatedItem };
          }
          return originalItem;
        }),
      });
    },
  });

  const canItemsBeModified = useMemo(
    () => canEnvelopeItemsBeModified(envelope, envelope.recipients),
    [envelope, envelope.recipients],
  );

  const debouncedUpdateEnvelopeItems = useDebounceFunction(
    useCallback(
      (items: { envelopeItemId: string; richTextContent?: string | null }[]) => {
        if (items.length === 0) {
          return;
        }
        updateEnvelopeItems({
          envelopeId: envelope.id,
          data: items.map((item) => ({
            envelopeItemId: item.envelopeItemId,
            richTextContent: item.richTextContent ?? undefined,
          })),
        });
      },
      [envelope.id, updateEnvelopeItems],
    ),
    500,
  );

  const onRichTextContentChange = useCallback(
    (envelopeItemId: string, richTextContent: string) => {
      const newItems = envelope.envelopeItems.map((item) =>
        item.id === envelopeItemId
          ? { ...item, richTextContent: richTextContent || null }
          : item,
      );
      setLocalEnvelope({ envelopeItems: newItems });
      debouncedUpdateEnvelopeItems(
        newItems.map((item) => ({
          envelopeItemId: item.id,
          richTextContent: item.richTextContent ?? undefined,
        })),
      );
    },
    [envelope.envelopeItems, setLocalEnvelope, debouncedUpdateEnvelopeItems],
  );

  const insertFieldPlaceholder = useCallback(
    (envelopeItemId: string, fieldId: number | string) => {
      const placeholder = `${FIELD_PLACEHOLDER_PREFIX}${fieldId}${FIELD_PLACEHOLDER_SUFFIX}`;
      const ref = editorRefs.current.get(envelopeItemId);
      ref?.insertAtCursor(placeholder);
    },
    [],
  );

  const envelopeItems = useMemo(
    () => envelope.envelopeItems.sort((a, b) => a.order - b.order),
    [envelope.envelopeItems],
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <Card backdropBlur={false} className="border">
        <CardHeader className="pb-3">
          <CardTitle>
            <Trans>Rich Text Content</Trans>
          </CardTitle>
          <CardDescription>
            <Trans>
              Edit the content that will be displayed on the signing page. Use the Insert field
              button to add placeholders that reference fields from Step 2. Placeholders use the
              format: {FIELD_PLACEHOLDER_PREFIX}id{FIELD_PLACEHOLDER_SUFFIX}
            </Trans>
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {envelopeItems.map((item) => {
            const fieldsForItem = editorFields.localFields.filter(
              (field) => field.envelopeItemId === item.id,
            );

            return (
              <div key={item.id} className="space-y-2">
                <h3 className="text-sm font-medium">{item.title}</h3>
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="mb-2">
                    <TabsTrigger value="edit" className="gap-1.5">
                      <PencilIcon className="h-4 w-4" />
                      <Trans>Edit</Trans>
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-1.5">
                      <EyeIcon className="h-4 w-4" />
                      <Trans>Preview</Trans>
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit" className="mt-0">
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <RichTextEditor
                          ref={(el) => {
                            if (el) {
                              editorRefs.current.set(item.id, el);
                            }
                          }}
                          value={item.richTextContent ?? ''}
                          onChange={(html) => onRichTextContentChange(item.id, html)}
                          placeholder={t`Enter contract content for signing page...`}
                          disabled={!canItemsBeModified}
                          minHeight="200px"
                        />
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canItemsBeModified || fieldsForItem.length === 0}
                          >
                            <Trans>Insert field</Trans>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {fieldsForItem.map((field) => {
                            const displayId = field.id ?? field.formId;
                            const typeLabel =
                              i18n._(FRIENDLY_FIELD_TYPE[field.type]) ?? field.type;
                            const checkboxMeta = field.type === 'CHECKBOX'
                              ? (field.fieldMeta as {
                                  values?: { id: number; value: string }[];
                                } | null)
                              : null;
                            const checkboxOptions = checkboxMeta?.values ?? [];

                            if (field.type === 'CHECKBOX' && checkboxOptions.length > 0) {
                              return (
                                <DropdownMenuSub key={field.formId}>
                                  <DropdownMenuSubTrigger>
                                    {typeLabel} (ID: {displayId})
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuItem
                                      onClick={() =>
                                        insertFieldPlaceholder(item.id, String(displayId))
                                      }
                                    >
                                      <Trans>All options</Trans>
                                    </DropdownMenuItem>
                                    {checkboxOptions.map((opt, idx) => (
                                      <DropdownMenuItem
                                        key={idx}
                                        onClick={() =>
                                          insertFieldPlaceholder(
                                            item.id,
                                            `${displayId}:${idx}`,
                                          )
                                        }
                                      >
                                        {opt.value || `Option ${idx + 1}`} (ID: {opt.id})
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                              );
                            }

                            return (
                              <DropdownMenuItem
                                key={field.formId}
                                onClick={() => insertFieldPlaceholder(item.id, String(displayId))}
                              >
                                {typeLabel} (ID: {displayId})
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TabsContent>
                  <TabsContent value="preview" className="mt-0">
                    <RichTextPreview
                      richTextContent={item.richTextContent ?? ''}
                      fieldsForItem={fieldsForItem}
                      i18n={i18n}
                    />
                  </TabsContent>
                </Tabs>
                {fieldsForItem.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    <Trans>Add fields in Step 2 first, then insert them here.</Trans>
                  </p>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" asChild>
          <Link to={`${relativePath.editorPath}?step=addFields`}>
            <Trans>Back to Fields</Trans>
          </Link>
        </Button>
        <Button asChild>
          <Link to={`${relativePath.editorPath}?step=preview`}>
            <Trans>Preview</Trans>
          </Link>
        </Button>
      </div>
    </div>
  );
};
