/**
 * Building blocks for the pre-rendered (static, SEO) pages.
 * Everything here renders to plain HTML at build time — no JavaScript needed to read it.
 */
import type { ComponentChildren } from 'preact';
import { SITE } from '../config/site';
import { Brand, SiteFooter, SiteNav } from '../components/site';
import { SupportCard } from '../components/support';
import { Icon } from '../components/ui';
import type { IconName } from '../components/icon-data';

export interface Crumb {
  label: string;
  path?: string;
}

export const abs = (path: string) => `${SITE.url}${path}`;

export function SiteHeader({ base }: { base: string }) {
  return (
    <header class="topbar static">
      <Brand base={base} />
      <SiteNav base={base} />
      <a class="btn btn-filled btn-md has-icon topbar-cta" href={base}>
        <span class="state" />
        <Icon name="calculate" size={20} />
        <span class="btn-label">Calculator</span>
      </a>
    </header>
  );
}

export function Crumbs({ items, base }: { items: Crumb[]; base: string }) {
  return (
    <nav class="crumbs" aria-label="Breadcrumb">
      <a href={base}>Home</a>
      {items.map((c, i) => (
        <>
          <span aria-hidden="true">›</span>
          {c.path && i < items.length - 1 ? <a href={`${base}${c.path.replace(/^\//, '')}`}>{c.label}</a> : <span aria-current="page">{c.label}</span>}
        </>
      ))}
    </nav>
  );
}

export function PageShell(props: { base: string; crumbs: Crumb[]; children: ComponentChildren }) {
  return (
    <>
      <SiteHeader base={props.base} />
      <main class="layout page">
        <Crumbs items={props.crumbs} base={props.base} />
        {props.children}
        <SupportCard />
      </main>
      <SiteFooter base={props.base} />
    </>
  );
}

export function PageHero(props: { eyebrow?: ComponentChildren; title: ComponentChildren; lede: ComponentChildren; children?: ComponentChildren }) {
  return (
    <section class="page-hero">
      {props.eyebrow && <span class="eyebrow">{props.eyebrow}</span>}
      <h1>{props.title}</h1>
      <p class="lede">{props.lede}</p>
      {props.children}
    </section>
  );
}

export function Tiles({ items }: { items: { label: string; value: string; sub?: string; accent?: boolean }[] }) {
  return (
    <div class="tiles">
      {items.map((t) => (
        <div class={`tile ${t.accent ? 'accent' : ''}`}>
          <span class="tile-label">{t.label}</span>
          <span class="tile-value">{t.value}</span>
          {t.sub && <span class="tile-sub">{t.sub}</span>}
        </div>
      ))}
    </div>
  );
}

export function Section(props: { id?: string; icon?: IconName; title: ComponentChildren; sub?: ComponentChildren; children: ComponentChildren; class?: string }) {
  return (
    <section class={`card page-section ${props.class ?? ''}`} id={props.id}>
      <div class="card-head">
        <h2 class="card-title">
          {props.icon && <Icon name={props.icon} />} {props.title}
        </h2>
        {props.sub && <span class="card-sub">{props.sub}</span>}
      </div>
      {props.children}
    </section>
  );
}

export function DataTable(props: {
  head: ComponentChildren[];
  rows: { cells: ComponentChildren[]; highlight?: boolean }[];
  caption?: string;
  firstColLeft?: boolean;
}) {
  return (
    <div class="table-scroll">
      <table class="dtable">
        {props.caption && <caption class="sr-only">{props.caption}</caption>}
        <thead>
          <tr>
            {props.head.map((h) => (
              <th scope="col">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {props.rows.map((r) => (
            <tr class={r.highlight ? 'hl' : ''}>
              {r.cells.map((c, i) => (i === 0 ? <th scope="row">{c}</th> : <td>{c}</td>))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LinkGrid({ links, base }: { links: { path: string; label: string; sub?: string; current?: boolean }[]; base: string }) {
  return (
    <ul class="link-grid">
      {links.map((l) => (
        <li>
          <a href={`${base}${l.path.replace(/^\//, '')}`} aria-current={l.current ? 'page' : undefined}>
            <span>{l.label}</span>
            {l.sub && <small>{l.sub}</small>}
          </a>
        </li>
      ))}
    </ul>
  );
}

export interface QA {
  q: string;
  a: string;
}

export function Faq({ items, title = 'Questions people ask' }: { items: QA[]; title?: string }) {
  return (
    <section class="about page-faq">
      <h2 class="section-title">
        <Icon name="help" size={28} /> {title}
      </h2>
      <div class="faq">
        {items.map((f, i) => (
          <details class="faq-item" open={i === 0}>
            <summary>
              {f.q}
              <Icon name="keyboard_arrow_down" class="faq-chevron" />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function CtaBand(props: { href: string; title: string; body: string; button: string }) {
  return (
    <section class="cta-band">
      <div>
        <h2>{props.title}</h2>
        <p>{props.body}</p>
      </div>
      <a class="btn btn-filled btn-md has-icon" href={props.href}>
        <span class="state" />
        <Icon name="tune" size={20} />
        <span class="btn-label">{props.button}</span>
      </a>
    </section>
  );
}

export function Sources({ updated }: { updated: string }) {
  return (
    <p class="note sources">
      Rates from Revenue, the Department of Finance (Budget 2025, 2026 and 2027) and the Department of Social Protection. Budget 2027 figures apply from 1
      January 2027 once the Finance Act is passed. Single PAYE employee, no other income, standard credits unless stated. Updated {updated}.
    </p>
  );
}

/* ---------------- JSON-LD ---------------- */

export const ldBreadcrumbs = (items: Crumb[]) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [{ label: 'Home', path: '/' } as Crumb, ...items].map((c, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name: c.label,
    ...(c.path ? { item: abs(c.path) } : {}),
  })),
});

export const ldFaq = (items: QA[]) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
});

export const ldWebApp = (name: string, path: string, description: string) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name,
  url: abs(path),
  description,
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Any',
  isAccessibleForFree: true,
  inLanguage: 'en-IE',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
});
