import { DocumentStatus, FieldType, RecipientRole } from '@prisma/client';
import { CheckCircle2, Clock8, Loader2 } from 'lucide-react';
import { match } from 'ts-pattern';

import signingCelebration from '@documenso/assets/images/signing-celebration.png';
import { getOptionalSession } from '@documenso/auth/server/lib/utils/get-session';
import { useOptionalSession } from '@documenso/lib/client-only/providers/session';
import { getDocumentAndSenderByToken } from '@documenso/lib/server-only/document/get-document-by-token';
import { isRecipientAuthorized } from '@documenso/lib/server-only/document/is-recipient-authorized';
import { getFieldsForToken } from '@documenso/lib/server-only/field/get-fields-for-token';
import { getRecipientByToken } from '@documenso/lib/server-only/recipient/get-recipient-by-token';
import { getRecipientSignatures } from '@documenso/lib/server-only/recipient/get-recipient-signatures';
import { getUserByEmail } from '@documenso/lib/server-only/user/get-user-by-email';
import { env } from '@documenso/lib/utils/env';
import { trpc } from '@documenso/trpc/react';
import { SigningCard3D } from '@documenso/ui/components/signing-card';
import { Badge } from '@documenso/ui/primitives/badge';

import { DocumentSigningAuthPageView } from '~/components/general/document-signing/document-signing-auth-page';

import type { Route } from './+types/complete';

// Preload critical resources for faster page load
export const links: Route.LinksFunction = () => [
  {
    rel: 'preconnect',
    href: '/api/files',
  },
];

export async function loader({ params, request }: Route.LoaderArgs) {
  const { user } = await getOptionalSession(request);

  const { token } = params;

  if (!token) {
    throw new Response('Not Found', { status: 404 });
  }

  const document = await getDocumentAndSenderByToken({
    token,
    requireAccessAuth: false,
  }).catch(() => null);

  if (!document || !document.documentData) {
    throw new Response('Not Found', { status: 404 });
  }

  const [fields, recipient] = await Promise.all([
    getFieldsForToken({ token }),
    getRecipientByToken({ token }).catch(() => null),
  ]);

  if (!recipient) {
    throw new Response('Not Found', { status: 404 });
  }

  const isDocumentAccessValid = await isRecipientAuthorized({
    type: 'ACCESS',
    documentAuthOptions: document.authOptions,
    recipient,
    userId: user?.id,
  });

  if (!isDocumentAccessValid) {
    return {
      isDocumentAccessValid: false,
      recipientEmail: recipient.email,
    } as const;
  }

  const signatures = await getRecipientSignatures({ recipientId: recipient.id });
  const isExistingUser = await getUserByEmail({ email: recipient.email })
    .then((u) => !!u)
    .catch(() => false);

  const recipientName =
    recipient.name ||
    fields.find((field) => field.type === FieldType.NAME)?.customText ||
    recipient.email;

  const canSignUp = !isExistingUser && env('NEXT_PUBLIC_DISABLE_SIGNUP') !== 'true';

  const canRedirectToFolder =
    user && document.userId === user.id && document.folderId && document.team?.url;

  const returnToHomePath = canRedirectToFolder
    ? `/t/${document.team.url}/documents/f/${document.folderId}`
    : '/';

  return {
    isDocumentAccessValid: true,
    canSignUp,
    recipientName,
    recipientEmail: recipient.email,
    signatures,
    document,
    recipient,
    returnToHomePath,
  };
}

export default function CompletedSigningPage({ loaderData }: Route.ComponentProps) {
  const { sessionData } = useOptionalSession();
  const user = sessionData?.user;

  const { isDocumentAccessValid, recipientName, signatures, document, recipient, recipientEmail } =
    loaderData;

  // Poll signing status every few seconds
  const { data: signingStatusData } = trpc.envelope.signingStatus.useQuery(
    {
      token: recipient?.token || '',
    },
    {
      refetchInterval: 3000,
      initialData: match(document?.status)
        .with(DocumentStatus.COMPLETED, () => ({ status: 'COMPLETED' }) as const)
        .with(DocumentStatus.REJECTED, () => ({ status: 'REJECTED' }) as const)
        .with(DocumentStatus.PENDING, () => ({ status: 'PENDING' }) as const)
        .otherwise(() => ({ status: 'PENDING' }) as const),
    },
  );

  // Use signing status from query if available, otherwise fall back to document status
  const signingStatus = signingStatusData?.status ?? 'PENDING';

  if (!isDocumentAccessValid) {
    return <DocumentSigningAuthPageView email={recipientEmail} />;
  }

  return (
    <div className="-mx-4 flex flex-col items-center overflow-hidden px-4 pt-16 md:-mx-8 md:px-8 lg:pt-20 xl:pt-28">
      <div className="relative mt-6 flex w-full flex-col items-center justify-center">
        <div className="flex flex-col items-center">
          <Badge variant="neutral" size="default" className="mb-6 rounded-xl border bg-transparent">
            <span className="block max-w-[10rem] truncate font-medium hover:underline md:max-w-[20rem]">
              {document.title}
            </span>
          </Badge>

          {/* Card with recipient */}
          <SigningCard3D
            name={recipientName}
            signature={signatures.at(0)}
            signingCelebrationImage={signingCelebration}
          />

          <h2 className="mt-6 max-w-[35ch] text-center text-2xl font-semibold leading-normal md:text-3xl lg:text-4xl">
            {recipient.role === RecipientRole.SIGNER && <>文件已簽署</>}
            {recipient.role === RecipientRole.VIEWER && <>文件已查看</>}
            {recipient.role === RecipientRole.APPROVER && <>文件已批准</>}
          </h2>

          {match({ status: signingStatus, deletedAt: document.deletedAt })
            .with({ status: 'COMPLETED' }, () => (
              <div className="mt-4 flex items-center text-center text-documenso-700">
                <CheckCircle2 className="mr-2 h-5 w-5" />
                <span className="text-sm">所有人已簽署</span>
              </div>
            ))
            .with({ status: 'PROCESSING' }, () => (
              <div className="mt-4 flex items-center text-center text-orange-600">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span className="text-sm">處理文件中</span>
              </div>
            ))
            .with({ deletedAt: null }, () => (
              <div className="mt-4 flex items-center text-center text-blue-600">
                <Clock8 className="mr-2 h-5 w-5" />
                <span className="text-sm">等待其他人簽署</span>
              </div>
            ))
            .otherwise(() => (
              <div className="flex items-center text-center text-red-600">
                <Clock8 className="mr-2 h-5 w-5" />
                <span className="text-sm">文件不再可供簽署</span>
              </div>
            ))}

          {match({ status: signingStatus, deletedAt: document.deletedAt })
            .with({ status: 'COMPLETED' }, () => null)
            .with({ status: 'PROCESSING' }, () => null)
            .with({ deletedAt: null }, () => null)
            .otherwise(() => (
              <p className="mt-2.5 max-w-[60ch] text-center text-sm font-medium text-muted-foreground/60 md:text-base">
                此文件已被擁有者取消，不再可供他人簽署。
              </p>
            ))}
        </div>
      </div>
    </div>
  );
}
