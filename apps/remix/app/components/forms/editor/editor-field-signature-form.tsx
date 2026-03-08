import { useEffect } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Trans } from '@lingui/react/macro';
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

import { EditorGenericFontSizeField } from './editor-field-generic-field-forms';

const ZSignatureFieldFormSchema = ZSignatureFieldMeta.pick({
  fontSize: true,
  richTextSigningArea: true,
});

type TSignatureFieldFormSchema = z.infer<typeof ZSignatureFieldFormSchema>;

type EditorFieldSignatureFormProps = {
  value: TSignatureFieldMeta | undefined;
  onValueChange: (value: TSignatureFieldMeta) => void;
  /** When true, the rich text signing area checkbox is disabled (another field already has it). */
  richTextSigningAreaDisabled?: boolean;
};

export const EditorFieldSignatureForm = ({
  value = {
    type: 'signature',
  },
  onValueChange,
  richTextSigningAreaDisabled = false,
}: EditorFieldSignatureFormProps) => {
  const form = useForm<TSignatureFieldFormSchema>({
    resolver: zodResolver(ZSignatureFieldFormSchema),
    mode: 'onChange',
    defaultValues: {
      fontSize: value.fontSize || DEFAULT_SIGNATURE_TEXT_FONT_SIZE,
      richTextSigningArea: value.richTextSigningArea ?? false,
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
      onValueChange({
        type: 'signature',
        ...value,
        ...validatedFormValues.data,
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
                    disabled={richTextSigningAreaDisabled}
                  />
                </FormControl>
                <div className="space-y-0.5 leading-none">
                  <FormLabel className="text-xs font-normal">
                    <Trans>Use as rich text signing area for this signer</Trans>
                  </FormLabel>
                  <p className="text-xs text-muted-foreground">
                    <Trans>
                      Each signer can have at most one. When enabled, this field appears as the
                      bottom signature bar in rich text signing mode.
                    </Trans>
                  </p>
                </div>
              </FormItem>
            )}
          />
        </fieldset>
      </form>
    </Form>
  );
};
