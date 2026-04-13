import { Trans } from '@lingui/react/macro';
import { OrganisationType, RecipientRole } from '@prisma/client';
import { P, match } from 'ts-pattern';

import { getRecipientActionVerbZhHk } from '@documenso/lib/constants/recipient-roles';

import { Button, Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentInviteProps {
  inviterName: string;
  inviterEmail: string;
  documentName: string;
  signDocumentLink: string;
  assetBaseUrl: string;
  role: RecipientRole;
  selfSigner: boolean;
  teamName?: string;
  includeSenderDetails?: boolean;
  organisationType?: OrganisationType;
}

export const TemplateDocumentInvite = ({
  inviterName,
  documentName,
  signDocumentLink,
  assetBaseUrl,
  role,
  selfSigner,
  teamName,
  includeSenderDetails,
  organisationType,
}: TemplateDocumentInviteProps) => {
  const actionVerbZhHk = getRecipientActionVerbZhHk(role);

  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center text-lg font-semibold text-[#b30000]">
          {match({ selfSigner, organisationType, includeSenderDetails, teamName })
            .with({ selfSigner: true }, () => (
              <Trans>
                請{actionVerbZhHk}您的文件
                <br />「{documentName}」
              </Trans>
            ))
            .with(
              {
                organisationType: OrganisationType.ORGANISATION,
                includeSenderDetails: true,
                teamName: P.string,
              },
              () => (
                <Trans>
                  {inviterName} 代表「{teamName}」邀請您{actionVerbZhHk}
                  <br />「{documentName}」
                </Trans>
              ),
            )
            .with({ organisationType: OrganisationType.ORGANISATION, teamName: P.string }, () => (
              <Trans>
                {teamName} 邀請您{actionVerbZhHk}
                <br />「{documentName}」
              </Trans>
            ))
            .otherwise(() => (
              <Trans>
                {inviterName} 邀請您{actionVerbZhHk}
                <br />「{documentName}」
              </Trans>
            ))}
        </Text>

        <Text className="my-1 text-center text-base text-slate-400">
          {match(role)
            .with(RecipientRole.SIGNER, () => <Trans>請簽署文件以繼續。</Trans>)
            .with(RecipientRole.VIEWER, () => <Trans>請檢視文件以繼續。</Trans>)
            .with(RecipientRole.APPROVER, () => <Trans>請審批文件以繼續。</Trans>)
            .with(RecipientRole.CC, () => '')
            .with(RecipientRole.ASSISTANT, () => <Trans>請協助處理文件以繼續。</Trans>)
            .exhaustive()}
        </Text>

        <Section className="mb-6 mt-8 text-center">
          <Button
            className="text-sbase inline-flex items-center justify-center rounded-lg bg-[#F53333] px-6 py-3 text-center font-medium text-black no-underline"
            href={signDocumentLink}
          >
            {match(role)
              .with(RecipientRole.SIGNER, () => <Trans>檢視並簽署文件</Trans>)
              .with(RecipientRole.VIEWER, () => <Trans>檢視文件</Trans>)
              .with(RecipientRole.APPROVER, () => <Trans>檢視並審批文件</Trans>)
              .with(RecipientRole.CC, () => '')
              .with(RecipientRole.ASSISTANT, () => <Trans>檢視並協助文件</Trans>)
              .exhaustive()}
          </Button>
        </Section>
      </Section>
    </>
  );
};

export default TemplateDocumentInvite;
