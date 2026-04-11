import { Trans } from '@lingui/react/macro';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export type TemplateConfirmationEmailProps = {
  confirmationLink: string;
  assetBaseUrl: string;
};

export const TemplateConfirmationEmail = ({
  confirmationLink,
  assetBaseUrl,
}: TemplateConfirmationEmailProps) => {
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section className="flex-row items-center justify-center">
        <Text className="mx-auto mb-0 max-w-[80%] text-center text-lg font-semibold text-primary">
          <Trans>歡迎使用香港資管通 FundConnectHK！</Trans>
        </Text>

        <Text className="my-1 text-center text-base text-slate-400">
          <Trans>請點擊下方按鈕確認您的電子郵件地址：</Trans>
        </Text>

        <Section className="mb-6 mt-8 text-center">
          <Button
            className="inline-flex items-center justify-center rounded-lg bg-[#F53333] px-6 py-3 text-center text-sm font-medium text-black no-underline"
            href={confirmationLink}
          >
            <Trans>確認電子郵件</Trans>
          </Button>
          <Text className="mt-8 text-center text-sm italic text-slate-400">
            <Trans>您也可以將此連結複製到瀏覽器：{confirmationLink}（連結 1 小時內有效）</Trans>
          </Text>
        </Section>
      </Section>
    </>
  );
};
