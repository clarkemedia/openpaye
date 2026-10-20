/**
 * Site-wide settings, read from environment variables at build time
 * (put them in `.env`, or pass them as Docker build args). All optional.
 *
 *   VITE_SITE_URL=https://example.ie            Canonical URL (used by the website build)
 *   VITE_REPO_URL=https://github.com/you/openpaye  Footer "Source code" link
 *   VITE_DONATE_URL=https://paypal.me/you       Optional support link (PayPal, Ko-fi, GitHub Sponsors…)
 *   VITE_SITE_PAGES=1                           Set by `npm run build:site` (.env.site), which adds the guide and salary pages
 */
import pkg from '../../package.json';

const env = (import.meta as any).env ?? {};
const clean = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim().replace(/\/$/, '') : undefined);

export const SITE = {
  name: 'OpenPAYE',
  version: (pkg as { version: string }).version,
  domain: 'openpaye.ie',
  url: clean(env.VITE_SITE_URL) ?? 'https://openpaye.ie',
  repoUrl: clean(env.VITE_REPO_URL) ?? 'https://github.com/clarkemedia/openpaye',
  donateUrl: clean(env.VITE_DONATE_URL),
  /** True on the website build, where the salary, hourly and guide pages exist */
  pages: env.VITE_SITE_PAGES === '1' || env.VITE_SITE_PAGES === 'true',
};
