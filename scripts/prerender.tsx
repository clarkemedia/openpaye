/**
 * Pre-renders the static, search-friendly pages into dist/ after `vite build`.
 * Run with: npx vite-node scripts/prerender.tsx
 */
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import renderToString from 'preact-render-to-string';
import { SITE } from '../src/config/site';
import { allThemesCss } from '../src/lib/theme';
import { App, FAQ as HOME_FAQ } from '../src/app';
import { EmployerApp } from '../src/employer/employer-app';
import { abs, ldBreadcrumbs, ldFaq, ldWebApp } from '../src/seo/kit';
import { SALARIES, HOURLY, TAKE_HOME } from '../src/seo/data';
import { hourlyHub, hourlyPage, salaryHub, salaryPage, takeHomeHub, takeHomePage, type PageOut } from '../src/seo/programmatic';
import { budgetPage, GUIDES, guidePages, guidesHub, notFoundPage, widgetPage } from '../src/seo/editorial';
import { calculate, DEFAULT_INPUTS } from '../src/tax/engine';
import { YEARS } from '../src/tax/years';

const DIST = join(process.cwd(), 'dist');
const manifest = JSON.parse(readFileSync(join(DIST, '.vite/manifest.json'), 'utf8'));
function cssFor(key: string, seen = new Set<string>()): string[] {
  if (seen.has(key)) return [];
  seen.add(key);
  const e = manifest[key];
  return [...(e.css ?? []), ...(e.imports ?? []).flatMap((i: string) => cssFor(i, seen))];
}
const mainCss: string[] = [...new Set(cssFor('index.html'))];
const today = new Date().toISOString().slice(0, 10);
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const ld = (o: object) => `<script type="application/ld+json">${JSON.stringify(o).replace(/</g, '\\u003c')}</script>`;
const icons = (base: string) => `<link rel="icon" href="${base}favicon.ico" sizes="48x48" />
<link rel="icon" href="${base}favicon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="${base}apple-touch-icon.png" />
<link rel="manifest" href="${base}site.webmanifest" />`;

/* Shared assets ---------------------------------------------------- */

writeFileSync(join(DIST, 'theme.css'), allThemesCss());

// Applies the visitor's saved theme before paint (external file so a strict CSP works)
writeFileSync(
  join(DIST, 'theme-boot.js'),
  `try{var d=document.documentElement,m=JSON.parse(localStorage.getItem('openpaye:mode')||'"system"'),s=JSON.parse(localStorage.getItem('openpaye:seed')||'"shamrock"');if(m==='light'||m==='dark')d.setAttribute('data-theme',m);if(s&&s!=='shamrock')d.setAttribute('data-seed',s)}catch(e){}`,
);

// Salary jump form + copy buttons
writeFileSync(
  join(DIST, 'site.js'),
  `(function(){
var pages=${JSON.stringify(SALARIES)};function onPage(v){return pages.indexOf(v)>=0}
function b64(o){return btoa(JSON.stringify(o)).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'')}
document.querySelectorAll('form[data-jump]').forEach(function(f){f.addEventListener('submit',function(e){
var v=parseFloat((f.querySelector('input').value||'').replace(/[^0-9.]/g,''));if(!(v>0))return;e.preventDefault();
var b=f.getAttribute('data-base')||'/';location.href=onPage(v)?b+'salary/'+v+'/':b+'#c='+b64({amount:v})})});
document.querySelectorAll('[data-copy]').forEach(function(btn){btn.addEventListener('click',function(){
var t=document.getElementById(btn.getAttribute('data-copy')).innerText,l=btn.querySelector('.btn-label');
(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(function(){l.textContent='Copied'},function(){l.textContent='Select & copy'});
setTimeout(function(){l.textContent='Copy'},2000)})});
})();`,
);

/* Document shell ----------------------------------------------------- */

function head(o: { path: string; title: string; description: string; base: string; jsonLd: object[]; noindex?: boolean }) {
  const url = abs(o.path.replace(/index\.html$/, ''));
  return `<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<title>${esc(o.title)}</title>
<meta name="description" content="${esc(o.description)}" />
${o.noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${url}" />`}
<link rel="alternate" hreflang="en-IE" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="OpenPAYE" />
<meta property="og:locale" content="en_IE" />
<meta property="og:title" content="${esc(o.title)}" />
<meta property="og:description" content="${esc(o.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE.url}/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="theme-color" content="#f6fbf3" />
${icons(o.base)}
<script src="${o.base}theme-boot.js"></script>
${mainCss.map((c) => `<link rel="stylesheet" href="${o.base}${c}" />`).join('\n')}
<link rel="stylesheet" href="${o.base}theme.css" />
${o.jsonLd.map(ld).join('\n')}`;
}

function writePage(p: PageOut) {
  const depth = p.path === '/404.html' ? 0 : p.path.split('/').filter(Boolean).length;
  const base = p.path === '/404.html' ? '/' : '../'.repeat(depth) || './';
  const jsonLd = [ldBreadcrumbs(p.crumbs), ...(p.jsonLd ?? [])];
  const faqItems = extractFaq(p);
  if (faqItems.length) jsonLd.push(ldFaq(faqItems));
  const html = `<!doctype html>
<html lang="en-IE">
<head>
${head({ ...p, base, jsonLd, noindex: p.path === '/404.html' })}
</head>
<body class="static-page">
${renderToString(p.body)}
<script src="${base}site.js" defer></script>
</body>
</html>`;
  const file = p.path.endsWith('.html') ? join(DIST, p.path) : join(DIST, p.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
}

/** Pull FAQ Q&A pairs out of the rendered page for FAQPage structured data. */
function extractFaq(p: PageOut) {
  const html = renderToString(p.body);
  const out: { q: string; a: string }[] = [];
  const re = /<details class="faq-item"[^>]*><summary>(.*?)<svg[\s\S]*?<\/summary><p>([\s\S]*?)<\/p><\/details>/g;
  let mm: RegExpExecArray | null;
  const strip = (s: string) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"').trim();
  while ((mm = re.exec(html))) out.push({ q: strip(mm[1]), a: strip(mm[2]) });
  return out;
}

/* Pre-render the interactive apps so crawlers see real content ----------- */

function prerenderApp(file: string, vnode: preact.VNode, meta: { path: string; title: string; description: string; jsonLd: object[] }) {
  const path = join(DIST, file);
  let html = readFileSync(path, 'utf8');
  const depth = meta.path.split('/').filter(Boolean).length;
  const base = '../'.repeat(depth) || './';
  const url = abs(meta.path);
  const extra = `<link rel="canonical" href="${url}" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="OpenPAYE" />
<meta property="og:locale" content="en_IE" />
<meta property="og:title" content="${esc(meta.title)}" />
<meta property="og:description" content="${esc(meta.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE.url}/og.png" />
<meta name="twitter:card" content="summary_large_image" />
<script src="${base}theme-boot.js"></script>
${meta.jsonLd.map(ld).join('\n')}`;
  html = html.replace('</head>', `${extra}\n</head>`);
  html = html.replace('<div id="app"></div>', `<div id="app">${renderToString(vnode)}</div>`);
  writeFileSync(path, html);
}

const HOME_DESC = 'See exactly what you take home in Ireland. Income Tax, USC and PRSI for 2025, 2026 and Budget 2027, with every step of the maths shown. Free, private and open source.';
prerenderApp('index.html', <App />, {
  path: '/',
  title: 'OpenPAYE: Irish salary after tax calculator 2025, 2026 & Budget 2027',
  description: HOME_DESC,
  jsonLd: [ldWebApp('OpenPAYE salary after tax calculator', '/', HOME_DESC), ldFaq(HOME_FAQ), { '@context': 'https://schema.org', '@type': 'Organization', name: SITE.name, url: SITE.url, logo: `${SITE.url}/og.png` }],
});
const EMP_DESC = 'What an employee really costs in Ireland: gross pay plus employer PRSI, auto-enrolment and pension for 2025, 2026 and Budget 2027.';
prerenderApp('employer-cost/index.html', <EmployerApp />, {
  path: '/employer-cost/',
  title: 'Employer cost calculator Ireland 2026 & 2027 · OpenPAYE',
  description: EMP_DESC,
  jsonLd: [ldWebApp('OpenPAYE employer cost calculator', '/employer-cost/', EMP_DESC), ldBreadcrumbs([{ label: 'Employer cost', path: '/employer-cost/' }])],
});

/* Generate every page ------------------------------------------------ */

const pages: PageOut[] = [
  salaryHub(),
  hourlyHub(),
  takeHomeHub(),
  budgetPage(),
  guidesHub(),
  ...guidePages(),
  widgetPage(),
  notFoundPage(),
  ...SALARIES.map(salaryPage),
  ...HOURLY.map(hourlyPage),
  ...TAKE_HOME.map(takeHomePage),
];

const t0 = Date.now();
pages.forEach(writePage);

/* Sitemap & robots --------------------------------------------------- */

// lastmod is when a page's content last changed (from git), not the build date, so search engines can trust it
function changed(paths: string[]) {
  try {
    return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...paths], { encoding: 'utf8' }).trim() || today;
  } catch {
    return today;
  }
}
const RATES = ['src/tax'];
const appDate = changed([...RATES, 'src/app.tsx', 'src/components', 'src/employer']);
const listDate = changed([...RATES, 'src/seo/programmatic.tsx', 'src/seo/data.ts', 'src/seo/kit.tsx']);
const guideDate = changed([...RATES, 'src/seo/editorial.tsx', 'src/seo/kit.tsx']);
const isList = (path: string) => /^\/(salary|hourly|take-home)\//.test(path);

const urls = [
  { loc: abs('/'), priority: 1, lastmod: appDate },
  { loc: abs('/employer-cost/'), priority: 0.8, lastmod: appDate },
  ...pages
    .filter((p) => !p.path.endsWith('.html'))
    .map((p) => ({ loc: abs(p.path), priority: p.priority ?? 0.5, lastmod: isList(p.path) ? listDate : guideDate })),
];
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`)
    .join('\n')}\n</urlset>\n`,
);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /embed.html\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

/* llms.txt: a plain-text guide to the site for AI assistants (llmstxt.org) -------- */

const eur = (n: number) => `€${Math.round(n).toLocaleString('en-IE')}`;
const pc = (n: number) => `${+(n * 100).toFixed(2)}%`;
const yearFacts = (y: 2026 | 2027) => {
  const c = YEARS[y];
  const net = calculate({ ...DEFAULT_INPUTS, year: y, amount: 50000 }).net;
  return [
    `- ${y}${c.status === 'announced' ? ' (Budget 2027, announced 6 October 2026)' : ''}: Income Tax 20% up to ${eur(c.incomeTax.bands.single)} (single), 40% above. Personal and PAYE credits ${eur(c.credits.personalSingle)} each.`,
    `  USC ${c.usc.bands.map((b) => pc(b.rate)).join(' / ')} (bands to ${c.usc.bands.slice(0, -1).map((b) => eur(b.upTo)).join(', ')}); no USC on income of ${eur(c.usc.exemptionThreshold)} or less.`,
    `  PRSI Class A ${c.prsi.periods.map((p) => `${pc(p.rate)} from ${p.from}`).join(', ')}. A single person on €50,000 takes home ${eur(net)} a year (${eur(net / 12)} a month).`,
  ].join('\n');
};
writeFileSync(
  join(DIST, 'llms.txt'),
  `# OpenPAYE

> Free, open-source salary after tax calculator for Ireland. It works out Income Tax, USC and PRSI for 2025, 2026 and Budget 2027 and shows every step of the maths. Everything runs in the browser: no cookies, no tracking, no sign-up.

Figures are estimates for PAYE employees. A real payslip depends on the person's Revenue tax credit certificate and when in the year they started. Rates come from Revenue, the Department of Finance and the Department of Social Protection. Not affiliated with Revenue or the Government of Ireland.

## Calculators

- [Salary after tax calculator](${abs('/')}): gross to take-home by year, month, fortnight, week, day and hour, with pensions, AVCs, auto-enrolment, bonuses, company shares, benefits-in-kind, tax credits, public sector ASC and household (joint assessment) options. Inputs are kept in the page address, so a link opens the exact calculation.
- [Employer cost calculator](${abs('/employer-cost/')}): employer PRSI, auto-enrolment matching and pension on top of salary.

## Salary tables

- [Salaries after tax](${abs('/salary/')}): one page per salary from ${eur(SALARIES[0])} to ${eur(SALARIES[SALARIES.length - 1])}, for example [€50,000 after tax](${abs('/salary/50000/')}).
- [Hourly wage after tax](${abs('/hourly/')}): take-home for common hourly rates, including the minimum wage.
- [Net to gross](${abs('/take-home/')}): the gross salary needed for a given monthly take-home.

## Guides

- [Budget 2027](${abs('/budget-2027/')}): what changed and what it means for take-home pay.
${GUIDES.map((g) => `- [${g.label}](${abs(`/guides/${g.slug}/`)}): ${g.sub}.`).join('\n')}

## Key rates

${yearFacts(2026)}
${yearFacts(2027)}

## Optional

- [Widget and API](${abs('/widget/')}): show take-home pay next to salaries on other websites.${SITE.repoUrl ? `\n- [Source code](${SITE.repoUrl}): MIT licence. All rates live in src/tax/years.ts.` : ''}
`,
);

/* security.txt (RFC 9116) ---------------------------------------------- */

if (SITE.repoUrl) {
  const expires = new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z');
  mkdirSync(join(DIST, '.well-known'), { recursive: true });
  writeFileSync(
    join(DIST, '.well-known/security.txt'),
    `Contact: ${SITE.repoUrl}/security/advisories/new\nExpires: ${expires}\nPreferred-Languages: en\nCanonical: ${SITE.url}/.well-known/security.txt\n`,
  );
}

// The share image is only needed by the website build, so it lives here rather than in public/
copyFileSync(join(process.cwd(), 'src/seo/og.png'), join(DIST, 'og.png'));
console.log(`prerendered ${pages.length} pages + 2 apps in ${Date.now() - t0} ms · sitemap has ${urls.length} URLs`);
