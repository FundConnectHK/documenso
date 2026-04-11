import { Trans } from '@lingui/react/macro';

import { Section, Text } from '../components';
import { TemplateDocumentImage } from './template-document-image';

export interface TemplateDocumentCancelProps {
  inviterName: string;
  inviterEmail: string;
  documentName: string;
  assetBaseUrl: string;
  cancellationReason?: string;
}

export const TemplateDocumentCancel = ({
  inviterName,
  documentName,
  assetBaseUrl,
  cancellationReason,
}: TemplateDocumentCancelProps) => {
  return (
    <>
      <TemplateDocumentImage className="mt-6" assetBaseUrl={assetBaseUrl} />

      <Section>
        <Text className="mx-auto mb-0 max-w-[80%] text-center text-lg font-semibold text-primary">
          <Trans>
            {inviterName} 已取消文件
            <br />「{documentName}」
          </Trans>
        </Text>

        <Text className="my-1 text-center text-base text-slate-400">
          <Trans>所有簽名已作廢。</Trans>
        </Text>

        <Text className="my-1 text-center text-base text-slate-400">
          <Trans>您無需再簽署此文件。</Trans>
        </Text>

        {cancellationReason && (
          <Text className="mt-4 text-center text-base">
            <Trans>取消原因：{cancellationReason}</Trans>
          </Text>
        )}
      </Section>
    </>
  );
};

export default TemplateDocumentCancel;
