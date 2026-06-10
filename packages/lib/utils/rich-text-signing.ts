import { SigningViewMode } from '@prisma/client';

const FIELD_PLACEHOLDER_REGEX = /\{\{field:[^}]+\}\}/g;

export type EnvelopeItemSigningViewSettings = {
  richTextContent?: string | null;
  signingViewMode?: SigningViewMode | null;
};

/**
 * Returns true when rich text HTML contains meaningful content (not just empty editor markup).
 * Field placeholders count as meaningful content.
 */
export const isRichTextContentMeaningful = (content: string | null | undefined): boolean => {
  if (!content) {
    return false;
  }

  if (FIELD_PLACEHOLDER_REGEX.test(content)) {
    return true;
  }

  const text = content
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#8203;/g, '')
    .replace(/\u200B/g, '')
    .trim();

  return text.length > 0;
};

export const shouldUseRichTextSigningView = (item: EnvelopeItemSigningViewSettings): boolean => {
  const mode = item.signingViewMode ?? SigningViewMode.AUTO;

  if (mode === SigningViewMode.FORCE_PDF) {
    return false;
  }

  if (mode === SigningViewMode.FORCE_RICH_TEXT) {
    return true;
  }

  return isRichTextContentMeaningful(item.richTextContent);
};
