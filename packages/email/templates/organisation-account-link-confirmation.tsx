import { msg } from '@lingui/core/macro';
import { useLingui } from '@lingui/react';
import { Trans } from '@lingui/react/macro';

import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from '../components';
import { useBranding } from '../providers/branding';
import { TemplateFooter } from '../template-components/template-footer';
import TemplateImage from '../template-components/template-image';

type OrganisationAccountLinkConfirmationTemplateProps = {
  type: 'create' | 'link';
  confirmationLink: string;
  organisationName: string;
  assetBaseUrl: string;
};

export const OrganisationAccountLinkConfirmationTemplate = ({
  type = 'link',
  confirmationLink = '<CONFIRMATION_LINK>',
  organisationName = '<ORGANISATION_NAME>',
  assetBaseUrl = 'http://localhost:3002',
}: OrganisationAccountLinkConfirmationTemplateProps) => {
  const { _ } = useLingui();
  const branding = useBranding();

  const previewText =
    type === 'create'
      ? msg`有人請求代您建立帳戶`
      : msg`有人請求連結您的香港資管通 FundConnectHK 帳戶`;

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
                className="mx-auto h-12 w-12"
                assetBaseUrl={assetBaseUrl}
                staticAsset="building-2.png"
              />
            </Section>

            <Section className="p-2 text-slate-500">
              <Text className="text-center text-lg font-medium text-black">
                {type === 'create' ? (
                  <Trans>帳戶建立請求</Trans>
                ) : (
                  <Trans>連結您的香港資管通 FundConnectHK 帳戶</Trans>
                )}
              </Text>

              <Text className="text-center text-base">
                {type === 'create' ? (
                  <Trans>
                    <span className="font-bold">{organisationName}</span> 已請求代您建立帳戶。
                  </Trans>
                ) : (
                  <Trans>
                    <span className="font-bold">{organisationName}</span> 已請求將您的香港資管通
                    FundConnectHK 帳戶連結至其組織。
                  </Trans>
                )}
              </Text>

              {/* Placeholder text if we want to have the warning in the email as well. */}
              {/* <Section className="mt-6">
                <Text className="my-0 text-sm">
                  <Trans>
                    By accepting this request, you will be granting{' '}
                    <strong>{organisationName}</strong> full access to:
                  </Trans>
                </Text>

                <ul className="mb-0 mt-2">
                  <li className="text-sm">
                    <Trans>Your account, and everything associated with it</Trans>
                  </li>
                  <li className="mt-1 text-sm">
                    <Trans>Something something something</Trans>
                  </li>
                  <li className="mt-1 text-sm">
                    <Trans>Something something something</Trans>
                  </li>
                </ul>

                <Text className="mt-2 text-sm">
                  <Trans>
                    您可隨時在香港資管通的帳戶安全設定中解除連結{' '}
                    <Link href={`${assetBaseUrl}/settings/security/linked-accounts`}>here.</Link>
                  </Trans>
                </Text>
              </Section> */}

              <Section className="mb-6 mt-8 text-center">
                <Button
                  className="inline-flex items-center justify-center rounded-lg bg-[#F53333] px-6 py-3 text-center text-sm font-medium text-black no-underline"
                  href={confirmationLink}
                >
                  <Trans>檢視請求</Trans>
                </Button>
              </Section>
            </Section>

            <Text className="text-center text-xs text-slate-500">
              <Trans>連結將於 30 分鐘後失效。</Trans>
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

export default OrganisationAccountLinkConfirmationTemplate;
