import type { HTMLAttributes } from 'react';

import { Link } from 'react-router';

import { cn } from '@documenso/ui/lib/utils';

export type DocumentSigningDisclosureProps = HTMLAttributes<HTMLParagraphElement>;

export const DocumentSigningDisclosure = ({
  className,
  ...props
}: DocumentSigningDisclosureProps) => {
  return (
    <p className={cn('text-xs text-muted-foreground', className)} {...props}>
      繼續使用電子簽名即表示您確認並同意該簽名將用於簽署指定文件，並具有與手寫簽名相同的法律效力。完成電子簽署流程即表示您確認理解並接受這些條件。
      <span className="mt-2 block">
        閱讀完整的{' '}
        <Link
          className="text-documenso-700 underline"
          to="/articles/signature-disclosure"
          target="_blank"
        >
          簽名披露
        </Link>
        。
      </span>
    </p>
  );
};
