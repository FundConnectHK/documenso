import { DateTime } from 'luxon';

import { type SupportedLanguageCodes, isValidLanguageCode } from '../../constants/i18n';
import { encryptSecondaryData } from '../crypto/encrypt';
import { getBaseUrl, withPage } from './browser-manager';

export type GetAuditLogsPdfOptions = {
  documentId: number;
  // eslint-disable-next-line @typescript-eslint/ban-types
  language?: SupportedLanguageCodes | (string & {});
};

export const getAuditLogsPdf = async ({ documentId, language }: GetAuditLogsPdfOptions) => {
  const encryptedId = encryptSecondaryData({
    data: documentId.toString(),
    expiresAt: DateTime.now().plus({ minutes: 5 }).toJSDate().valueOf(),
  });

  const lang = isValidLanguageCode(language) ? language : 'en';
  const baseUrl = getBaseUrl();

  return withPage(
    async (context) => {
      const page = await context.newPage();

      await page.goto(`${baseUrl}/__htmltopdf/audit-log?d=${encryptedId}`, {
        waitUntil: 'networkidle',
        timeout: 10_000,
      });

      await page.reload({
        waitUntil: 'networkidle',
        timeout: 10_000,
      });

      await page.waitForSelector('h1', {
        state: 'visible',
        timeout: 10_000,
      });

      return page.pdf({
        format: 'A4',
        printBackground: true,
      });
    },
    {
      cookies: [{ name: 'language', value: lang, url: baseUrl }],
    },
  );
};
