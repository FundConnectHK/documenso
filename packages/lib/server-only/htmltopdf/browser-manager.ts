import type { Browser, BrowserContext } from 'playwright';

import {
  NEXT_PRIVATE_INTERNAL_WEBAPP_URL,
  NEXT_PUBLIC_WEBAPP_URL,
  USE_INTERNAL_URL_BROWSERLESS,
} from '../../constants/app';
import { env } from '../../utils/env';

/**
 * Singleton browser manager with a serial task queue.
 *
 * Why: Chromium uses ~400MB per instance. Launching one per PDF request causes
 * concurrent memory spikes that exceed Cloud Run limits. This manager keeps a
 * single browser alive and serialises all PDF generation through a promise chain,
 * so at most one page is active at any given time.
 */

/** Ref avoids `require-atomic-updates` on module-level `let` after `await`. */
const browserRef: { current: Browser | null } = { current: null };

let taskQueue: Promise<unknown> = Promise.resolve();

const getBrowser = async (): Promise<Browser> => {
  if (browserRef.current?.isConnected()) {
    return browserRef.current;
  }

  const { chromium } = await import('playwright');
  const browserlessUrl = env('NEXT_PRIVATE_BROWSERLESS_URL');

  const instance = browserlessUrl
    ? await chromium.connectOverCDP(browserlessUrl)
    : await chromium.launch();

  instance.on('disconnected', () => {
    if (browserRef.current === instance) {
      browserRef.current = null;
    }
  });

  // Only `withPage` calls `getBrowser`, and it serialises work via `taskQueue` — no concurrent inits.
  // eslint-disable-next-line require-atomic-updates -- false positive: singleton write after `await`
  browserRef.current = instance;
  return instance;
};

export const getBaseUrl = (): string => {
  return USE_INTERNAL_URL_BROWSERLESS ? NEXT_PUBLIC_WEBAPP_URL() : NEXT_PRIVATE_INTERNAL_WEBAPP_URL;
};

type WithPageOptions = {
  cookies?: Array<{ name: string; value: string; url: string }>;
};

/**
 * Enqueues a task that receives a fresh BrowserContext+Page.
 * Tasks run one at a time; the context is closed after each task regardless of outcome.
 */
export const withPage = async <T>(
  fn: (context: BrowserContext) => Promise<T>,
  options: WithPageOptions = {},
): Promise<T> => {
  const task = async (): Promise<T> => {
    const b = await getBrowser();
    const context = await b.newContext();

    if (options.cookies) {
      await context.addCookies(options.cookies);
    }

    try {
      return await fn(context);
    } finally {
      await context.close().catch(() => null);
    }
  };

  const queued = taskQueue.then(task, task);
  taskQueue = queued.then(
    () => undefined,
    () => undefined,
  );

  return queued;
};
