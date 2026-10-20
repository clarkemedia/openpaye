/**
 * Content Security Policy, written into every page as a <meta> tag so the privacy
 * rules travel with the site to any host (GitHub Pages, Cloudways, a CDN) without
 * needing server headers. nginx.conf and deploy/apache/.htaccess send the same rules
 * as headers, which also cover the parts a <meta> tag can't (framing, nosniff).
 */
export const CSP = "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-src 'self'";

export const PRIVACY_META = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />
    <meta name="referrer" content="strict-origin-when-cross-origin" />`;
