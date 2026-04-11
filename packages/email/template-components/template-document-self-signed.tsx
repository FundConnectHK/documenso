import { Trans } from '@lingui/react/macro';

import { env } from '@documenso/lib/utils/env';

import { Button, Column, Img, Link, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentSelfSignedProps {
  documentName: string;
  assetBaseUrl: string;
}

export const TemplateDocumentSelfSigned = ({
  documentName,
  assetBaseUrl,
}: TemplateDocumentSelfSignedProps) => {
  const NEXT_PUBLIC_WEBAPP_URL = env('NEXT_PUBLIC_WEBAPP_URL');

  const signUpUrl = `${NEXT_PUBLIC_WEBAPP_URL ?? 'http://localhost:3000'}/signup`;

  const getAssetUrl = (path: string) => {
    return new URL(path, assetBaseUrl).toString();
  };

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section className="flex-row items-center justify-center">
        <Section>
          <Column align="center">
            <Text className="text-base font-semibold text-[#7AC455]">
              <Img
                src={getAssetUrl('/static/completed.png')}
                className="-mt-0.5 mr-2 inline h-7 w-7 align-middle"
              />
              <Trans>已完成</Trans>
            </Text>
          </Column>
        </Section>

        <Text className="mb-0 mt-6 text-center text-lg font-semibold text-primary">
          <Trans>您已簽署「{documentName}」</Trans>
        </Text>

        <Text className="mx-auto mb-6 mt-1 max-w-[80%] text-center text-base text-slate-400">
          <Trans>
            建立{' '}
            <Link
              href={signUpUrl}
              target="_blank"
              className="whitespace-nowrap text-[#B30000] hover:text-[#D11818]"
            >
              免費帳戶
            </Link>{' '}
            以隨時存取您已簽署的文件。
          </Trans>
        </Text>

        <Section className="mb-6 mt-8 text-center">
          <Button
            href={signUpUrl}
            className="mr-4 rounded-lg border border-solid border-slate-200 px-4 py-2 text-center text-sm font-medium text-black no-underline"
          >
            <Img
              src={getAssetUrl('/static/user-plus.png')}
              className="mb-0.5 mr-2 inline h-5 w-5 align-middle"
            />
            <Trans>建立帳戶</Trans>
          </Button>

          <Button
            className="rounded-lg border border-solid border-slate-200 px-4 py-2 text-center text-sm font-medium text-black no-underline"
            href={signUpUrl}
          >
            <Img
              src={getAssetUrl('/static/review.png')}
              className="mb-0.5 mr-2 inline h-5 w-5 align-middle"
            />
            <Trans>檢視方案</Trans>
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateDocumentSelfSigned;
