import { SigningViewMode } from '@prisma/client';
import { describe, expect, it } from 'vitest';

import { isRichTextContentMeaningful, shouldUseRichTextSigningView } from './rich-text-signing';

describe('isRichTextContentMeaningful', () => {
  it('returns false for null, empty, and empty editor markup', () => {
    expect(isRichTextContentMeaningful(null)).toBe(false);
    expect(isRichTextContentMeaningful('')).toBe(false);
    expect(isRichTextContentMeaningful('<p></p>')).toBe(false);
    expect(isRichTextContentMeaningful('<p><br></p>')).toBe(false);
    expect(isRichTextContentMeaningful('<p>&nbsp;</p>')).toBe(false);
  });

  it('returns true for text content and field placeholders', () => {
    expect(isRichTextContentMeaningful('<p>合同内容</p>')).toBe(true);
    expect(isRichTextContentMeaningful('<p>{{field:123}}</p>')).toBe(true);
  });
});

describe('shouldUseRichTextSigningView', () => {
  it('respects signing view mode overrides', () => {
    expect(
      shouldUseRichTextSigningView({
        signingViewMode: SigningViewMode.FORCE_PDF,
        richTextContent: '<p>合同内容</p>',
      }),
    ).toBe(false);

    expect(
      shouldUseRichTextSigningView({
        signingViewMode: SigningViewMode.FORCE_RICH_TEXT,
        richTextContent: null,
      }),
    ).toBe(true);

    expect(
      shouldUseRichTextSigningView({
        signingViewMode: SigningViewMode.AUTO,
        richTextContent: '<p></p>',
      }),
    ).toBe(false);

    expect(
      shouldUseRichTextSigningView({
        signingViewMode: SigningViewMode.AUTO,
        richTextContent: '<p>合同内容</p>',
      }),
    ).toBe(true);
  });
});
