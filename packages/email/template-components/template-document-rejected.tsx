import { Trans } from '@lingui/react/macro';

import { Button, Heading, Text } from '../components';

export interface TemplateDocumentRejectedProps {
  documentName: string;
  recipientName: string;
  rejectionReason?: string;
  documentUrl: string;
}

export function TemplateDocumentRejected({
  documentName,
  recipientName: signerName,
  rejectionReason,
  documentUrl,
}: TemplateDocumentRejectedProps) {
  return (
    <div className="mt-4">
      <Heading className="mb-4 text-center text-2xl font-semibold text-slate-800">
        <Trans>文件已拒簽</Trans>
      </Heading>

      <Text className="mb-4 text-base">
        <Trans>
          {signerName} 已拒簽文件「{documentName}」。
        </Trans>
      </Text>

      {rejectionReason && (
        <Text className="mb-4 text-base text-slate-400">
          <Trans>拒簽原因：{rejectionReason}</Trans>
        </Text>
      )}

      <Text className="mb-6 text-base">
        <Trans>您可點擊下方按鈕檢視文件及其狀態。</Trans>
      </Text>

      <Button
        href={documentUrl}
        className="inline-flex items-center justify-center rounded-lg bg-[#F53333] px-6 py-3 text-center text-sm font-medium text-black no-underline"
      >
        <Trans>檢視文件</Trans>
      </Button>
    </div>
  );
}
