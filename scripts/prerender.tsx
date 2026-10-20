/**
 * Pre-renders the static, search-friendly pages into dist/ after `vite build`.
 * Run with: npx vite-node scripts/prerender.tsx
 */
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
import { budgetPage, guidePages, guidesHub, notFoundPage, widgetPage } from '../src/seo/editorial';

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
const FAVICON = readFileSync(join(process.cwd(), 'index.html'), 'utf8').match(/<link rel="icon"[^>]+>/)![0];

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
${FAVICON}
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

const urls = [
  { loc: abs('/'), priority: 1 },
  { loc: abs('/employer-cost/'), priority: 0.8 },
  ...pages.filter((p) => !p.path.endsWith('.html')).map((p) => ({ loc: abs(p.path), priority: p.priority ?? 0.5 })),
];
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority.toFixed(1)}</priority></url>`)
    .join('\n')}\n</urlset>\n`,
);
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /embed.html\n\nSitemap: ${SITE.url}/sitemap.xml\n`);

// The share image is only needed by the website build, so it lives here rather than in public/
copyFileSync(join(process.cwd(), 'src/seo/og.png'), join(DIST, 'og.png'));
console.log(`prerendered ${pages.length} pages + 2 apps in ${Date.now() - t0} ms · sitemap has ${urls.length} URLs`);
