import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trans, useLingui } from '@lingui/react/macro';
import { useForm, useWatch } from 'react-hook-form';
import type { z } from 'zod';

import { DEFAULT_SIGNATURE_TEXT_FONT_SIZE } from '@documenso/lib/constants/pdf';
import { type TSignatureFieldMeta, ZSignatureFieldMeta } from '@documenso/lib/types/field-meta';
import { Checkbox } from '@documenso/ui/primitives/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@documenso/ui/primitives/form/form';

import { Input } from '@documenso/ui/primitives/input';

import { EditorGenericFontSizeField } from './editor-field-generic-field-forms';

const ZSignatureFieldFormSchema = ZSignatureFieldMeta.pick({
  fontSize: true,
  richTextSigningArea: true,
  richTextSigningAreaLabel: true,
});

type TSignatureFieldFormSchema = z.infer<typeof ZSignatureFieldFormSchema>;

type EditorFieldSignatureFormProps = {
  value: TSignatureFieldMeta | undefined;
  onValueChange: (value: TSignatureFieldMeta) => void;
};

export const EditorFieldSignatureForm = ({
  value = {
    type: 'signature',
    richTextSigningArea: false,
  },
  onValueChange,
}: EditorFieldSignatureFormProps) => {
  const { t } = useLingui();
  const form = useForm<TSignatureFieldFormSchema>({
    resolver: zodResolver(ZSignatureFieldFormSchema),
    mode: 'onChange',
    defaultValues: {
      fontSize: value.fontSize || DEFAULT_SIGNATURE_TEXT_FONT_SIZE,
      richTextSigningArea: value.richTextSigningArea ?? false,
      richTextSigningAreaLabel: value.richTextSigningAreaLabel ?? '',
    },
  });

  const { control } = form;

  const formValues = useWatch({
    control,
  });

  // Dupecode/Inefficient: Done because native isValid won't work for our usecase.
  useEffect(() => {
    const validatedFormValues = ZSignatureFieldFormSchema.safeParse(formValues);

    if (validatedFormValues.success) {
      const { type: _type, ...rest } = value;
      onValueChange({
        ...rest,
        ...validatedFormValues.data,
        type: 'signature',
      });
    }
  }, [formValues]);

  return (
    <Form {...form}>
      <form>
        <fieldset className="flex flex-col gap-2">
          <div>
            <EditorGenericFontSizeField formControl={form.control} />
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Trans>The typed signature font size</Trans>
            </p>
          </div>
          <FormField
            control={form.control}
            name="richTextSigningArea"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-0.5 leading-none">
                  <FormLabel className="text-xs font-normal">
                    <Trans>Use as rich text signing area for this signer</Trans>
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    <Trans>
                      When enabled, this field appears in the signature bar in rich text signing
                      mode. You can add multiple fields per signer (e.g., signature and stamp).
                    </Trans>
                  </p>
                </div>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="richTextSigningAreaLabel"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs">
                  <Trans>Label for this signing area</Trans>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder={t`e.g. 簽名, 蓋章`}
                    className="h-8 text-xs"
                  />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  <Trans>Shown above the signature box to indicate what to sign</Trans>
                </p>
              </FormItem>
            )}
          />
        </fieldset>
      </form>
    </Form>
  );
};
