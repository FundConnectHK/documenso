import { Trans } from '@lingui/react/macro';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export type TemplateForgotPasswordProps = {
  resetPasswordLink: string;
  assetBaseUrl: string;
};

export const TemplateForgotPassword = ({
  resetPasswordLink,
  assetBaseUrl,
}: TemplateForgotPasswordProps) => {
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section className="flex-row items-center justify-center">
        <Text className="mx-auto mb-0 max-w-[80%] text-center text-lg font-semibold text-primary">
          <Trans>忘記密碼？</Trans>
        </Text>

        <Text className="my-1 text-center text-base text-slate-400">
          <Trans>沒關係！請點擊下方按鈕重設您的密碼。</Trans>
        </Text>

        <Section className="mb-6 mt-8 text-center">
          <Button
            className="inline-flex items-center justify-center rounded-lg bg-[#F53333] px-6 py-3 text-center text-sm font-medium text-black no-underline"
            href={resetPasswordLink}
          >
            <Trans>重設密碼</Trans>
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateForgotPassword;
