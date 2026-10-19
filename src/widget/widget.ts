/**
 * OpenPAYE widget — drop-in take-home pay for any web page.
 *
 *   <script src="https://openpaye.ie/widget.js" defer></script>
 *
 * 1. Inline figures (great for job ads):
 *      <span data-openpaye-net="45000"></span>             → €3,0xx/month take-home
 *      <span data-openpaye-net="40000-50000"></span>       → ranges work too
 *    Options: data-period="year|month|week|hour" (of the input, default year)
 *             data-show="month|year|week" (default month)
 *             data-year="2025|2026|2027"  data-status="single|singleParent|marriedOne|marriedTwo"
 *             data-format="badge|text"   (default badge)
 *
 * 2. Full calculator in an auto-sizing iframe:
 *      <div data-openpaye-calculator data-salary="45000" data-theme="auto"></div>
 *
 * 3. JavaScript:  OpenPAYE.calculate({ salary: 45000, year: 2027 })
 */
import { calculate, DEFAULT_INPUTS, fromAnnual, type FamilyStatus, type Inputs, type Period } from '../tax/engine';
import { DEFAULT_YEAR, YEAR_LIST, type TaxYear } from '../tax/years';

const script = document.currentScript as HTMLScriptElement | null;
const HOST = script?.src ? new URL('.', script.src).href.replace(/\/$/, '') : 'https://openpaye.ie';

const eur = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export interface WidgetOptions {
  salary: number;
  period?: Period;
  year?: TaxYear;
  status?: FamilyStatus;
}

function run(o: WidgetOptions) {
  const year = YEAR_LIST.includes(o.year as TaxYear) ? (o.year as TaxYear) : DEFAULT_YEAR;
  const inputs: Inputs = { ...DEFAULT_INPUTS, amount: o.salary, period: o.period ?? 'year', year, family: o.status ?? 'single' };
  return calculate(inputs);
}

function publicCalculate(o: WidgetOptions) {
  const r = run(o);
  const s = DEFAULT_INPUTS.schedule;
  return {
    year: r.year,
    gross: r.gross,
    incomeTax: r.incomeTax,
    usc: r.usc,
    prsi: r.prsi,
    net: r.net,
    netMonthly: fromAnnual(r.net, 'month', s),
    netWeekly: fromAnnual(r.net, 'week', s),
    effectiveRate: r.effectiveRate,
    marginalRate: r.marginalRate,
  };
}

const PER: Record<string, string> = { month: '/month', year: '/year', week: '/week', fortnight: '/fortnight' };

function injectStyles() {
  if (document.getElementById('openpaye-widget-css')) return;
  const st = document.createElement('style');
  st.id = 'openpaye-widget-css';
  st.textContent = `.openpaye-badge{display:inline-flex;align-items:center;gap:.4em;padding:.15em .65em .15em .5em;border-radius:999px;background:#d7f0dd;color:#0d3b20;font:500 .9em/1.6 system-ui,sans-serif;text-decoration:none;white-space:nowrap}
.openpaye-badge:hover{background:#c3e8cd}.openpaye-badge b{font-weight:700}.openpaye-badge i{font-style:normal;opacity:.7;font-size:.85em}
@media (prefers-color-scheme:dark){.openpaye-badge{background:#1f4d30;color:#d7f0dd}.openpaye-badge:hover{background:#28603c}}
.openpaye-frame{width:100%;border:0;min-height:420px;display:block;color-scheme:normal}`;
  document.head.appendChild(st);
}

function renderNet(el: HTMLElement) {
  const raw = (el.dataset.openpayeNet ?? '').replace(/[€,\s]/g, '');
  const parts = raw.split(/[-–]/).map(Number).filter((n) => n > 0);
  if (!parts.length) return;
  const period = (el.dataset.period as Period) || 'year';
  const show = (el.dataset.show as Period) || 'month';
  const year = Number(el.dataset.year) as TaxYear;
  const status = el.dataset.status as FamilyStatus | undefined;
  const nets = parts.map((salary) => fromAnnual(run({ salary, period, year, status }).net, show, DEFAULT_INPUTS.schedule));
  const text = nets.map(eur).join('–') + (PER[show] ?? '');
  if (el.dataset.format === 'text') {
    el.textContent = text;
    return;
  }
  const annual = parts[0] * (period === 'month' ? 12 : period === 'week' ? 52 : period === 'hour' ? 2028 : 1);
  const a = document.createElement('a');
  a.className = 'openpaye-badge';
  const code = btoa(JSON.stringify({ amount: annual })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  a.href = `${HOST}/#c=${code}`;
  a.target = '_blank';
  a.rel = 'noopener';
  a.title = 'Estimated take-home pay after Income Tax, USC and PRSI (single person). Calculated by OpenPAYE';
  a.innerHTML = `≈ <b></b> take-home <i>OpenPAYE</i>`;
  a.querySelector('b')!.textContent = text;
  el.replaceChildren(a);
}

function mountCalculator(el: HTMLElement) {
  const params = new URLSearchParams();
  for (const k of ['salary', 'period', 'year', 'status', 'show', 'theme', 'seed', 'attribution']) {
    const v = el.dataset[k];
    if (v) params.set(k, v);
  }
  const f = document.createElement('iframe');
  f.className = 'openpaye-frame';
  f.title = 'Take-home pay calculator by OpenPAYE';
  f.loading = 'lazy';
  f.src = `${HOST}/embed.html?${params}`;
  el.replaceChildren(f);
  window.addEventListener('message', (e) => {
    if (e.source === f.contentWindow && e.data?.type === 'openpaye:resize') f.style.height = `${Math.ceil(e.data.height)}px`;
  });
}

function scan(root: ParentNode = document) {
  injectStyles();
  root.querySelectorAll<HTMLElement>('[data-openpaye-net]').forEach(renderNet);
  root.querySelectorAll<HTMLElement>('[data-openpaye-calculator]').forEach(mountCalculator);
}

const api = { calculate: publicCalculate, scan, version: '1.0.0' };
(window as any).OpenPAYE = api;

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => scan());
else scan();
