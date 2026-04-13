import type { MessageDescriptor } from '@lingui/core';

import { NEXT_PUBLIC_WEBAPP_URL } from '@documenso/lib/constants/app';

const resolveMetaTitle = (title?: string | MessageDescriptor) => {
  if (!title) {
    return undefined;
  }

  if (typeof title === 'string') {
    return title;
  }

  return title.message;
};

export const appMetaTags = (title?: string | MessageDescriptor) => {
  const resolvedTitle = resolveMetaTitle(title);
  const description =
    '资管通合同管理平台 - 专业的电子文档签署与合同管理系统，为香港资管通提供安全、高效、合规的合同全生命周期管理服务。';

  return [
    {
      title: resolvedTitle ? `${resolvedTitle} - 资管通合同管理平台` : '资管通合同管理平台',
    },
    {
      name: 'description',
      content: description,
    },
    {
      name: 'keywords',
      content:
        '资管通, FundConnectHK, 合同管理, 文档签署, 电子合同, 合同管理系统, 文档管理, 电子签名, 香港资管通',
    },
    {
      name: 'author',
      content: 'FundConnectHK / 香港资管通',
    },
    {
      name: 'robots',
      content: 'index, follow',
    },
    {
      property: 'og:title',
      content: '资管通合同管理平台 - FundConnectHK Contract Management Platform',
    },
    {
      property: 'og:description',
      content: description,
    },
    {
      property: 'og:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
    {
      property: 'og:type',
      content: 'website',
    },
    {
      name: 'twitter:card',
      content: 'summary_large_image',
    },
    {
      name: 'twitter:site',
      content: '@FundConnectHK',
    },
    {
      name: 'twitter:description',
      content: description,
    },
    {
      name: 'twitter:image',
      content: `${NEXT_PUBLIC_WEBAPP_URL()}/opengraph-image.jpg`,
    },
  ];
};
