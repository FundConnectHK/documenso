import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';

import { formatTeamUrl } from '@documenso/lib/utils/teams';

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from '../components';
import { useBranding } from '../providers/branding';
import { TemplateFooter } from '../template-components/template-footer';
import TemplateImage from '../template-components/template-image';

export type ConfirmTeamEmailProps = {
  assetBaseUrl: string;
  baseUrl: string;
  teamName: string;
  teamUrl: string;
  token: string;
};

export const ConfirmTeamEmailTemplate = ({
  assetBaseUrl = 'http://localhost:3002',
  baseUrl = 'https://contract.fundconnecthk.com',
  teamName = 'Team Name',
  teamUrl = 'demo',
  token = '',
}: ConfirmTeamEmailProps) => {
  const { _ } = useLingui();
  const branding = useBranding();

  const previewText = msg`接受團隊 ${teamName} 的電子郵件驗證請求 - 香港資管通 FundConnectHK`;

  return (
    <Html>
      <Head />
      <Preview>{_(previewText)}</Preview>

      <Body className="mx-auto my-auto font-sans">
        <Section className="bg-white">
          <Container className="mx-auto mb-2 mt-8 max-w-xl rounded-lg border border-solid border-slate-200 px-2 pt-2 backdrop-blur-sm">
            {branding.brandingEnabled && branding.brandingLogo ? (
              <Img src={branding.brandingLogo} alt="Branding Logo" className="mb-4 h-6 p-2" />
            ) : (
              <TemplateImage
                assetBaseUrl={assetBaseUrl}
                className="mb-4 h-6 p-2"
                staticAsset="logo.png"
              />
            )}

            <Section>
              <TemplateImage
                className="mx-auto"
                assetBaseUrl={assetBaseUrl}
                staticAsset="mail-open.png"
              />
            </Section>

            <Section className="p-2 text-slate-500">
              <Text className="text-center text-lg font-medium text-black">
                <Trans>驗證您的團隊電子郵件地址</Trans>
              </Text>

              <Text className="text-center text-base">
                <Trans>
                  <span className="font-bold">{teamName}</span>{' '}
                  已請求使用您的電子郵件地址作為其團隊於香港資管通 FundConnectHK 的聯絡信箱。
                </Trans>
              </Text>

              <div className="mx-auto mt-6 w-fit rounded-lg bg-gray-50 px-4 py-2 text-base font-medium text-slate-600">
                {formatTeamUrl(teamUrl, baseUrl)}
              </div>

              <Section className="mt-6">
                <Text className="my-0 text-sm">
                  <Trans>
                    接受此請求後，您將授予 <strong>{teamName}</strong> 以下權限：
                  </Trans>
                </Text>

                <ul className="mb-0 mt-2">
                  <li className="text-sm">
                    <Trans>檢視此電子郵件地址收發的所有文件</Trans>
                  </li>
                  <li className="mt-1 text-sm">
                    <Trans>允許文件收件人直接回覆至此電子郵件地址</Trans>
                  </li>
                  <li className="mt-1 text-sm">
                    <Trans>使用此電子郵件地址代表團隊發送文件</Trans>
                  </li>
                </ul>

                <Text className="mt-2 text-sm">
                  <Trans>
                    您可隨時在香港資管通的團隊設定中撤銷存取權限{' '}
                    <Link href={`${baseUrl}/settings/teams`}>按此。</Link>
                  </Trans>
                </Text>
              </Section>

              <Section className="mb-6 mt-8 text-center">
                <Button
                  className="inline-flex items-center justify-center rounded-lg bg-[#F53333] px-6 py-3 text-center text-sm font-medium text-black no-underline"
                  href={`${baseUrl}/team/verify/email/${token}`}
                >
                  <Trans>接受</Trans>
                </Button>
              </Section>
            </Section>

            <Text className="text-center text-xs text-slate-500">
              <Trans>連結將於 1 小時後失效。</Trans>
            </Text>
          </Container>

          <Hr className="mx-auto mt-12 max-w-xl" />

          <Container className="mx-auto max-w-xl">
            <TemplateFooter isDocument={false} />
          </Container>
        </Section>
      </Body>
    </Html>
  );
};

export default ConfirmTeamEmailTemplate;
