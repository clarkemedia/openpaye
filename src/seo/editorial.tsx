import { calculateForSalary, DEFAULT_INPUTS, type Inputs } from '../tax/engine';
import { encodeInputs } from '../lib/state';
import { YEAR_LIST, YEARS, type TaxYear } from '../tax/years';
import { eurWhole, pct, signedEur } from '../lib/format';
import { SITE } from '../config/site';
import { CtaBand, DataTable, Faq, LinkGrid, PageHero, PageShell, Section, Sources, Tiles, type QA } from './kit';
import { CURRENT, NEXT, updatedLabel, type PageOut } from './programmatic';
import { salaryPath } from './data';

const calc = (year: TaxYear, salary: number, patch: Partial<Inputs> = {}) => calculateForSalary({ ...DEFAULT_INPUTS, year, ...patch }, salary);
const rate = (n: number, d = 1) => pct(n, d);
const Y = YEAR_LIST;

/* ================================================================== */
/* Budget 2027                                                        */
/* ================================================================== */

export function budgetPage(): PageOut {
  const base = '../';
  const a = YEARS[CURRENT];
  const b = YEARS[NEXT];
  const crumbs = [{ label: 'Budget 2027', path: '/budget-2027/' }];
  const salaries = [20000, 25000, 30000, 35000, 40000, 45000, 50000, 60000, 70000, 80000, 100000, 120000, 150000, 200000];
  const rows = (patch: Partial<Inputs>) =>
    salaries.map((s) => {
      const x = calc(CURRENT, s, patch);
      const y = calc(NEXT, s, patch);
      const d = x.totalTax - y.totalTax;
      return { cells: [<a href={`${base}${salaryPath(s).slice(1)}`}>{eurWhole(s)}</a>, eurWhole(x.net / 12), eurWhole(y.net / 12), signedEur(d), signedEur(d / 12)] };
    });
  const at50 = calc(CURRENT, 50000).totalTax - calc(NEXT, 50000).totalTax;
  const faq: QA[] = [
    {
      q: 'When does Budget 2027 take effect?',
      a: 'Budget 2027 was announced on 6 October 2026. The income tax and USC changes apply from 1 January 2027, once the Finance Act 2026 is passed. Your employer applies them automatically through payroll.',
    },
    {
      q: 'How much better off will I be after Budget 2027?',
      a: `A single PAYE worker on €50,000 pays ${eurWhole(at50)} less tax in 2027 than in 2026, about ${eurWhole(at50 / 12)} a month. That already includes the scheduled PRSI increase. See the table for other salaries.`,
    },
    {
      q: 'Did Budget 2027 change PRSI?',
      a: 'No new change. PRSI keeps rising under the Social Welfare Act already in law: employee Class A goes from 4.35% to 4.5% on 1 October 2027. The weekly threshold for the higher employer rate rises from €552 to €600.',
    },
    {
      q: 'What happened to Mortgage Interest Relief?',
      a: 'Mortgage Interest Tax Credit was not extended, so it is not available for 2027. It still applies to interest paid in 2025 and 2026.',
    },
  ];
  const changes: [string, string, string][] = [
    ['Standard rate cut-off (single)', eurWhole(a.incomeTax.bands.single), eurWhole(b.incomeTax.bands.single)],
    ['Standard rate cut-off (married, one income)', eurWhole(a.incomeTax.bands.marriedOneIncome), eurWhole(b.incomeTax.bands.marriedOneIncome)],
    ['Standard rate cut-off (single parent)', eurWhole(a.incomeTax.bands.singleParent), eurWhole(b.incomeTax.bands.singleParent)],
    ['Personal tax credit', eurWhole(a.credits.personalSingle), eurWhole(b.credits.personalSingle)],
    ['Employee (PAYE) tax credit', eurWhole(a.credits.employee), eurWhole(b.credits.employee)],
    ['Home Carer tax credit', eurWhole(a.credits.homeCarer), eurWhole(b.credits.homeCarer)],
    ['USC 2% band ends at', eurWhole(a.usc.bands[1].upTo), eurWhole(b.usc.bands[1].upTo)],
    ['Rent Tax Credit (single)', eurWhole(a.credits.rentSingle), eurWhole(b.credits.rentSingle)],
    ['Mortgage Interest Tax Credit', `up to ${eurWhole(a.credits.mortgageInterestCap ?? 0)}`, 'ended'],
    ['Minimum wage', `€${a.context.minimumWageHourly.toFixed(2)}`, `€${b.context.minimumWageHourly.toFixed(2)}`],
    ['Employee PRSI from 1 October', rate(a.prsi.periods[1].rate, 2), rate(b.prsi.periods[1].rate, 2)],
  ];
  return {
    path: '/budget-2027/',
    title: 'Budget 2027 calculator Ireland: how much will I get? (take-home pay)',
    description: `What Budget 2027 means for your pay. Standard rate band to €46,500, credits up €125, USC 2% band to €30,300. See your take-home in 2027 vs 2026 at every salary.`,
    crumbs,
    priority: 1,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero
          eyebrow="Budget 2027 · announced 6 October 2026"
          title="What Budget 2027 means for your pay"
          lede={`From 1 January 2027 the 20% band gets wider, the main tax credits rise by €125 and the USC 2% band widens. A single worker on €50,000 pays ${eurWhole(at50)} less tax a year.`}
        >
          <Tiles
            items={[
              { label: '20% band (single)', value: eurWhole(b.incomeTax.bands.single), sub: `+${eurWhole(b.incomeTax.bands.single - a.incomeTax.bands.single)}`, accent: true },
              { label: 'Personal & PAYE credits', value: eurWhole(b.credits.personalSingle), sub: 'each, +€125' },
              { label: 'USC 2% band to', value: eurWhole(b.usc.bands[1].upTo), sub: `from ${eurWhole(a.usc.bands[1].upTo)}` },
              { label: 'Rent Tax Credit', value: eurWhole(b.credits.rentSingle), sub: `from ${eurWhole(a.credits.rentSingle)}` },
            ]}
          />
        </PageHero>
        <Section icon="receipt_long" title="Everything that changed" sub={`${CURRENT} → ${NEXT}`}>
          <DataTable head={['', String(CURRENT), String(NEXT)]} rows={changes.map((c) => ({ cells: [c[0], c[1], <b>{c[2]}</b>] }))} />
        </Section>
        <Section icon="trending_up" title="Your take-home: 2026 vs 2027 (single)" sub="Monthly take-home and the change in tax. Includes the October PRSI increases.">
          <DataTable head={['Salary', `${CURRENT} / month`, `${NEXT} / month`, 'Tax change / year', 'Per month']} rows={rows({})} />
        </Section>
        <Section icon="family_restroom" title="Married couple, one income">
          <DataTable head={['Salary', `${CURRENT} / month`, `${NEXT} / month`, 'Tax change / year', 'Per month']} rows={rows({ family: 'marriedOne' })} />
        </Section>
        <CtaBand href={`${base}#c=${encodeInputs({ ...DEFAULT_INPUTS, year: NEXT })}`} title="See your own Budget 2027 result" body="Switch the calculator to 2027 to apply every change to your exact situation." button="Open the calculator" />
        <Faq items={faq} title="Budget 2027 questions" />
        <Sources updated={updatedLabel()} />
      </PageShell>
    ),
    jsonLd: [],
  };
}

/* ================================================================== */
/* Guides                                                             */
/* ================================================================== */

const GUIDES = [
  { slug: 'tax-bands', label: 'Income tax bands', sub: 'Standard rate cut-off points' },
  { slug: 'tax-credits', label: 'Tax credits', sub: 'Personal, PAYE, rent and more' },
  { slug: 'usc', label: 'USC rates', sub: 'Universal Social Charge bands' },
  { slug: 'prsi', label: 'PRSI rates', sub: 'Employee and employer' },
  { slug: 'auto-enrolment', label: 'Auto-enrolment', sub: 'My Future Fund contributions' },
  { slug: 'minimum-wage', label: 'Minimum wage', sub: 'Hourly rates and take-home' },
];

export function guidesHub(): PageOut {
  const base = '../';
  const crumbs = [{ label: 'Guides', path: '/guides/' }];
  return {
    path: '/guides/',
    title: `Irish tax guides ${CURRENT} & ${NEXT}: bands, credits, USC, PRSI`,
    description: 'Plain-English guides to Irish income tax bands, tax credits, USC, PRSI, auto-enrolment and the minimum wage, with every rate for 2025, 2026 and 2027.',
    crumbs,
    priority: 0.8,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero eyebrow="Guides" title="How Irish pay tax works" lede="Every rate, band and credit for 2025, 2026 and 2027, explained plainly, with the numbers the calculator uses." />
        <Section icon="receipt_long" title="Guides">
          <LinkGrid base={base} links={[{ path: '/budget-2027/', label: 'Budget 2027', sub: 'What changed' }, ...GUIDES.map((g) => ({ path: `/guides/${g.slug}/`, label: g.label, sub: g.sub }))]} />
        </Section>
      </PageShell>
    ),
  };
}

function guide(slug: string, title: string, description: string, h1: string, lede: string, content: preact.ComponentChildren, faq: QA[]): PageOut {
  const base = '../../';
  const g = GUIDES.find((x) => x.slug === slug)!;
  const crumbs = [{ label: 'Guides', path: '/guides/' }, { label: g.label, path: `/guides/${slug}/` }];
  return {
    path: `/guides/${slug}/`,
    title,
    description,
    crumbs,
    priority: 0.7,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero eyebrow={`Guide · ${Y.join(', ')}`} title={h1} lede={lede} />
        {content}
        <Faq items={faq} />
        <Section icon="receipt_long" title="More guides">
          <LinkGrid base={base} links={GUIDES.filter((x) => x.slug !== slug).map((x) => ({ path: `/guides/${x.slug}/`, label: x.label, sub: x.sub }))} />
        </Section>
        <Sources updated={updatedLabel()} />
      </PageShell>
    ),
  };
}

export function guidePages(): PageOut[] {
  const c = (y: TaxYear) => YEARS[y];
  const ex = [20000, 30000, 40000, 50000, 70000, 100000, 150000];
  return [
    guide(
      'tax-bands',
      `Income tax bands Ireland ${CURRENT} & ${NEXT}: standard rate cut-off points`,
      'The 20% and 40% income tax bands in Ireland for single people, single parents and married couples, for 2025, 2026 and 2027.',
      'Income tax bands',
      'Income up to your standard rate cut-off point is taxed at 20%. Everything above it is taxed at 40%. Your tax credits are then taken off the total.',
      <>
        <Section icon="receipt_long" title="Standard rate cut-off points">
          <DataTable
            head={['', ...Y.map(String)]}
            rows={[
              ['Single / widowed', (y: TaxYear) => c(y).incomeTax.bands.single],
              ['Single parent', (y: TaxYear) => c(y).incomeTax.bands.singleParent],
              ['Married, one income', (y: TaxYear) => c(y).incomeTax.bands.marriedOneIncome],
              ['Married, two incomes (max)', (y: TaxYear) => c(y).incomeTax.bands.marriedOneIncome + c(y).incomeTax.bands.marriedSecondIncomeIncrease],
            ].map(([l, f]) => ({ cells: [l as string, ...Y.map((y) => eurWhole((f as (y: TaxYear) => number)(y)))] }))}
          />
          <p class="note">For a two-income couple, the extra band is the lower of the second earner's income and {eurWhole(c(NEXT).incomeTax.bands.marriedSecondIncomeIncrease)} ({NEXT}). It can't be transferred.</p>
        </Section>
        <Section icon="calculate" title={`Income tax at different salaries (single, ${CURRENT})`}>
          <DataTable
            head={['Salary', 'At 20%', 'At 40%', 'Credits', 'Income tax']}
            rows={ex.map((s) => {
              const r = calc(CURRENT, s);
              return { cells: [eurWhole(s), eurWhole(r.taxAtStandard), eurWhole(r.taxAtHigher), `−${eurWhole(r.creditsUsed)}`, <b>{eurWhole(r.incomeTax)}</b>] };
            })}
          />
        </Section>
      </>,
      [
        { q: 'What is the standard rate cut-off point?', a: `It's the amount of income taxed at 20%. In ${NEXT} it is ${eurWhole(c(NEXT).incomeTax.bands.single)} for a single person, up from ${eurWhole(c(CURRENT).incomeTax.bands.single)} in ${CURRENT}.` },
        { q: 'Is the higher rate still 40%?', a: 'Yes. The 20% and 40% rates have not changed for 2025, 2026 or 2027.' },
      ],
    ),
    guide(
      'tax-credits',
      `Tax credits Ireland ${CURRENT} & ${NEXT}: personal, PAYE, rent and more`,
      'Every common Irish tax credit for 2025, 2026 and 2027: personal, employee (PAYE), single person child carer, home carer, age, rent and mortgage interest.',
      'Tax credits',
      'Tax credits reduce your income tax euro for euro. They can bring your income tax to zero, but they never create a refund on their own.',
      <Section icon="receipt_long" title="Tax credits by year">
        <DataTable
          head={['Credit', ...Y.map(String)]}
          rows={(
            [
              ['Personal (single)', (y: TaxYear) => c(y).credits.personalSingle],
              ['Personal (married)', (y: TaxYear) => c(y).credits.personalMarried],
              ['Employee (PAYE)', (y: TaxYear) => c(y).credits.employee],
              ['Single Person Child Carer', (y: TaxYear) => c(y).credits.singlePersonChildCarer],
              ['Home Carer', (y: TaxYear) => c(y).credits.homeCarer],
              ['Age (single, 65+)', (y: TaxYear) => c(y).credits.ageSingle],
              ['Incapacitated Child', (y: TaxYear) => c(y).credits.incapacitatedChild],
              ['Rent Tax Credit (single)', (y: TaxYear) => c(y).credits.rentSingle],
              ['Rent Tax Credit (couple)', (y: TaxYear) => c(y).credits.rentCouple],
              ['Mortgage Interest (max)', (y: TaxYear) => c(y).credits.mortgageInterestCap ?? 0],
            ] as [string, (y: TaxYear) => number][]
          ).map(([l, f]) => ({ cells: [l, ...Y.map((y) => (f(y) ? eurWhole(f(y)) : '—'))] }))}
        />
      </Section>,
      [
        { q: 'Do I get tax credits automatically?', a: 'Personal and PAYE credits are given automatically on your tax credit certificate. Others, such as the Rent Tax Credit, medical expenses or flat-rate expenses, you claim yourself in Revenue myAccount. It is free.' },
        { q: 'Do tax credits reduce USC or PRSI?', a: 'No. Tax credits only reduce income tax. USC and PRSI are charged separately.' },
      ],
    ),
    guide(
      'usc',
      `USC rates ${CURRENT} & ${NEXT} Ireland: Universal Social Charge bands`,
      'Universal Social Charge rates and bands in Ireland for 2025, 2026 and 2027, the €13,000 exemption, reduced rates for medical card holders and people over 70, and examples.',
      'USC rates and bands',
      `USC is charged on your total income, before pension contributions. If your income is ${eurWhole(c(CURRENT).usc.exemptionThreshold)} or less you pay none at all.`,
      <>
        <Section icon="percent" title="USC bands by year">
          <DataTable
            head={['Rate', ...Y.map(String)]}
            rows={c(CURRENT).usc.bands.map((band, i) => ({
              cells: [
                rate(band.rate),
                ...Y.map((y) => {
                  const b = c(y).usc.bands;
                  const from = i === 0 ? 0 : b[i - 1].upTo;
                  return b[i].upTo === Infinity ? `over ${eurWhole(from)}` : `${eurWhole(from)} – ${eurWhole(b[i].upTo)}`;
                }),
              ],
            }))}
          />
          <p class="note">
            Medical card holders and people aged 70+ with income of {eurWhole(c(CURRENT).usc.reducedIncomeLimit)} or less pay at most 2%.
          </p>
        </Section>
        <Section icon="calculate" title="USC at different salaries">
          <DataTable head={['Salary', ...Y.map(String)]} rows={ex.map((s) => ({ cells: [eurWhole(s), ...Y.map((y) => eurWhole(calc(y, s).usc))] }))} />
        </Section>
      </>,
      [
        { q: 'Who is exempt from USC?', a: `Anyone whose total income is ${eurWhole(c(CURRENT).usc.exemptionThreshold)} a year or less, and income from social welfare payments.` },
        { q: 'Did Budget 2027 cut USC?', a: `It widened the 2% band to ${eurWhole(c(NEXT).usc.bands[1].upTo)} from ${eurWhole(c(CURRENT).usc.bands[1].upTo)}, so more income is charged at 2% instead of 3%. The rates themselves are unchanged.` },
      ],
    ),
    guide(
      'prsi',
      `PRSI rates ${CURRENT} & ${NEXT} Ireland: employee and employer Class A`,
      'Class A PRSI rates for employees and employers in Ireland for 2025, 2026 and 2027, including the October increases, the €352 exemption and the PRSI credit.',
      'PRSI rates',
      'Employees pay Class A PRSI on all their earnings once they earn more than €352 a week. The rate rises every 1 October under the Social Welfare Act.',
      <>
        <Section icon="percent" title="Employee PRSI (Class A)">
          <DataTable
            head={['Year', '1 January – 30 September', '1 October – 31 December']}
            rows={Y.map((y) => ({ cells: [String(y), rate(c(y).prsi.periods[0].rate, 2), rate(c(y).prsi.periods[1].rate, 2)] }))}
          />
          <p class="note">
            Earn €352 a week or less and you pay no PRSI. Between €352.01 and €424 a week a PRSI credit of up to €12 a week reduces the charge.
          </p>
        </Section>
        <Section icon="business_center" title="Employer PRSI (Class A)">
          <DataTable
            head={['Year', 'Weekly threshold', 'Lower rate', 'Higher rate', 'From 1 October']}
            rows={Y.map((y) => {
              const e = c(y).employerPrsi;
              return { cells: [String(y), eurWhole(e.weeklyThreshold), rate(e.periods[0].low, 2), rate(e.periods[0].high, 2), `${rate(e.periods[1].low, 2)} / ${rate(e.periods[1].high, 2)}`] };
            })}
          />
          <p class="note">
            The higher rate applies to all of a week's pay once it's over the threshold. <a href="../../employer-cost/">Work out the full employer cost</a>.
          </p>
        </Section>
      </>,
      [
        { q: 'Why does my PRSI go up in October?', a: 'The Social Welfare (Miscellaneous Provisions) Act 2024 sets a PRSI increase every 1 October to strengthen the Social Insurance Fund, which pays for the State pension and other benefits.' },
        { q: 'Do I pay PRSI after 66?', a: 'No. Employees aged 66 and over do not pay employee PRSI.' },
      ],
    ),
    guide(
      'auto-enrolment',
      'Auto-enrolment Ireland (My Future Fund): contributions explained',
      "How Ireland's pension auto-enrolment works from 2026: who is enrolled, contribution rates from 1.5% to 6%, employer and State top-ups, and what it costs at each salary.",
      'Auto-enrolment: My Future Fund',
      'Since 1 January 2026, employees aged 23 to 60 earning over €20,000 who are not in a workplace pension are enrolled automatically. You, your employer and the State all contribute.',
      <>
        <Section icon="savings" title="Contribution rates">
          <DataTable
            head={['Years', 'You', 'Employer', 'State']}
            rows={[
              ['1–3 (2026–2028)', '1.5%', '1.5%', '0.5%'],
              ['4–6', '3%', '3%', '1%'],
              ['7–9', '4.5%', '4.5%', '1.5%'],
              ['10 onwards', '6%', '6%', '2%'],
            ].map((r) => ({ cells: r }))}
          />
          <p class="note">Contributions are calculated on gross pay up to €80,000 a year. Your contribution is taken from net pay, with no tax relief; the State top-up replaces it.</p>
        </Section>
        <Section icon="calculate" title={`What it means at your salary (${CURRENT})`}>
          <DataTable
            head={['Salary', 'You pay / year', 'Employer', 'State', 'Into your pot']}
            rows={[25000, 35000, 45000, 60000, 80000, 100000].map((s) => {
              const r = calc(CURRENT, s, { autoEnrolment: true });
              const a = r.autoEnrolment;
              return { cells: [eurWhole(s), eurWhole(a.employee), eurWhole(a.employer), eurWhole(a.state), <b>{eurWhole(a.employee + a.employer + a.state)}</b>] };
            })}
          />
        </Section>
      </>,
      [
        { q: 'Can I opt out of auto-enrolment?', a: 'You can opt out during set windows, the first after six months of membership. If you opt out, your own contributions are refunded, and you are re-enrolled after two years if you are still eligible.' },
        { q: 'Do I get tax relief on auto-enrolment?', a: 'No. Instead of tax relief the State adds €1 for every €3 you contribute.' },
      ],
    ),
    guide(
      'minimum-wage',
      `Minimum wage Ireland ${CURRENT} & ${NEXT}: hourly rate and take-home pay`,
      'The national minimum wage in Ireland for 2025, 2026 and 2027, with weekly, monthly and yearly take-home pay for a full-time worker.',
      'Minimum wage',
      `The national minimum wage is €${c(CURRENT).context.minimumWageHourly.toFixed(2)} an hour in ${CURRENT}, rising to €${c(NEXT).context.minimumWageHourly.toFixed(2)} from 1 January ${NEXT}.`,
      <Section icon="schedule" title="Minimum wage take-home (39 hours a week)">
        <DataTable
          head={['Year', 'Hourly', 'Gross / year', 'Net / week', 'Net / month']}
          rows={Y.map((y) => {
            const h = c(y).context.minimumWageHourly;
            const r = calc(y, h * 39 * 52);
            return { cells: [String(y), `€${h.toFixed(2)}`, eurWhole(h * 39 * 52), eurWhole(r.net / 52), eurWhole(r.net / 12)], highlight: y === CURRENT };
          })}
        />
        <p class="note">Full-time minimum wage earners pay little or no income tax because tax credits cover most of it, but USC and PRSI still apply.</p>
      </Section>,
      [{ q: 'How much is the minimum wage per week?', a: `At €${c(CURRENT).context.minimumWageHourly.toFixed(2)} for 39 hours, that's ${eurWhole(c(CURRENT).context.minimumWageHourly * 39)} gross a week in ${CURRENT}.` }],
    ),
  ];
}

/* ================================================================== */
/* Widget & API                                                       */
/* ================================================================== */

export function widgetPage(): PageOut {
  const base = '../';
  const crumbs = [{ label: 'Widget & API', path: '/widget/' }];
  const host = SITE.url;
  const snippetBadge = `<script src="${host}/widget.js" defer></script>\n\n<p>Salary: €45,000 <span data-openpaye-net="45000"></span></p>\n<p>Salary: €40,000–€50,000 <span data-openpaye-net="40000-50000"></span></p>`;
  const snippetCalc = `<script src="${host}/widget.js" defer></script>\n\n<div data-openpaye-calculator data-salary="45000" data-theme="auto"></div>`;
  const snippetIframe = `<iframe src="${host}/embed.html?salary=45000" title="Take-home pay calculator" style="width:100%;height:460px;border:0"></iframe>`;
  const snippetJs = `const r = OpenPAYE.calculate({ salary: 45000, year: 2027, status: 'single' });\n// → { net, netMonthly, incomeTax, usc, prsi, effectiveRate, … }`;
  const snippetApi = `GET https://api.${SITE.domain}/v1/calculate?salary=45000&year=2027\nGET https://api.${SITE.domain}/v1/calculate?net=3000&period=month\nGET https://api.${SITE.domain}/v1/employer?salary=45000`;
  const Code = ({ id, code }: { id: string; code: string }) => (
    <div class="code">
      <pre id={id}>
        <code>{code}</code>
      </pre>
      <button class="btn btn-tonal btn-sm code-copy" type="button" data-copy={id}>
        <span class="state" />
        <span class="btn-label">Copy</span>
      </button>
    </div>
  );
  return {
    path: '/widget/',
    title: 'Free take-home pay widget for Irish job ads and websites · OpenPAYE',
    description: 'Show Irish take-home pay next to any salary on your site. A free, open-source, privacy-friendly widget, plus a JSON API.',
    crumbs,
    priority: 0.7,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero
          eyebrow="Free and open source"
          title="Put take-home pay on every salary"
          lede="Candidates want to know what a salary really pays. One script tag shows the after-tax figure next to any salary on your page, using the same open-source engine as this site."
        />
        <div class="page-grid">
          <Section icon="payments" title="1. Badges for job ads" sub="Add data-openpaye-net to any element. Ranges work.">
            <div class="demo-ad">
              <b>Senior Nurse, Cork</b>
              <span>
                €45,000 a year <span data-openpaye-net="45000"></span>
              </span>
              <b>Software Engineer, Dublin</b>
              <span>
                €65,000–€80,000 <span data-openpaye-net="65000-80000"></span>
              </span>
            </div>
            <Code id="s1" code={snippetBadge} />
          </Section>
          <Section icon="widgets" title="2. Full calculator" sub="An auto-sizing calculator card. Follows the visitor's light/dark setting.">
            <div class="demo-frame" data-openpaye-calculator data-salary="45000" data-theme="auto"></div>
            <Code id="s2" code={snippetCalc} />
            <p class="note">
              No script? Use a plain iframe: <code>{snippetIframe}</code>
            </p>
          </Section>
        </div>
        <Section icon="code" title="Options">
          <DataTable
            head={['Attribute', 'Values', 'What it does']}
            rows={[
              ['data-openpaye-net', '45000 or 40000-50000', 'Salary (or range) to convert'],
              ['data-period', 'year · month · week · hour', 'What the salary figure is per (default year)'],
              ['data-show', 'month · year · week', 'Which take-home figure to show (default month)'],
              ['data-year', '2025 · 2026 · 2027', 'Tax year (default 2026)'],
              ['data-status', 'single · singleParent · marriedOne · marriedTwo', 'Tax status (default single)'],
              ['data-format', 'badge · text', 'Linked badge, or plain text'],
              ['data-theme', 'auto · light · dark', 'Calculator theme'],
              ['data-seed', 'shamrock · atlantic · heather · amber · fuchsia', 'Calculator colour'],
            ].map((r) => ({ cells: r.map((x) => <code>{x}</code>) }))}
          />
        </Section>
        <Section icon="data_object" title="JavaScript and JSON API" id="api">
          <Code id="s3" code={snippetJs} />
          <Code id="s4" code={snippetApi} />
          <p class="note">The API is an open-source Cloudflare Worker in the repo's api/ folder. Deploy your own for free.</p>
        </Section>
        <Section icon="verified" title="Free for everyone">
          <p class="prose">
            The widget and API are free for any site, commercial or not, under the MIT licence. Keep the small "Full breakdown" link if you like it, or hide it with{' '}
            <code>data-attribution="0"</code>. You can also host <code>widget.js</code> and <code>embed.html</code> yourself.
          </p>
        </Section>
        <script src={`${base}widget.js`} defer></script>
      </PageShell>
    ),
  };
}

export function notFoundPage(): PageOut {
  const base = '/';
  return {
    path: '/404.html',
    title: 'Page not found · OpenPAYE',
    description: 'This page does not exist.',
    crumbs: [{ label: 'Not found' }],
    body: (
      <PageShell base={base} crumbs={[{ label: 'Not found' }]}>
        <PageHero eyebrow="404" title="That page isn't here" lede="It may have moved. The calculator and every salary page are a click away." />
        <LinkGrid
          base={base}
          links={[
            { path: '/', label: 'Salary calculator' },
            { path: '/salary/', label: 'All salaries' },
            { path: '/budget-2027/', label: 'Budget 2027' },
            { path: '/guides/', label: 'Tax guides' },
          ]}
        />
      </PageShell>
    ),
  };
}

