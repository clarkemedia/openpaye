import { calculateForSalary, DEFAULT_INPUTS, solveGrossForNet, type Inputs, type Result } from '../tax/engine';
import { YEAR_LIST, YEARS, type TaxYear } from '../tax/years';
import { encodeInputs } from '../lib/state';
import { eurCents, eurWhole, pct, signedEur } from '../lib/format';
import { Breakdown, segmentsFor } from '../components/results';
import { SplitBar } from '../components/charts';
import { SupportCard } from '../components/support';
import { CtaBand, DataTable, Faq, LinkGrid, PageHero, PageShell, Section, Sources, Tiles, type QA } from './kit';
import { FULL_TIME_HOURS, HOURLY, hourlyPath, nearest, neighbours, SALARIES, salaryPath, TAKE_HOME, takeHomePath } from './data';

export const CURRENT: TaxYear = 2026;
export const NEXT: TaxYear = 2027;

const calc = (year: TaxYear, salary: number, patch: Partial<Inputs> = {}) => calculateForSalary({ ...DEFAULT_INPUTS, year, ...patch }, salary);
const m = (n: number) => eurWhole(n / 12);
const w = (n: number) => eurWhole(n / 52);
const k = (n: number) => (n >= 1000 && n % 1000 === 0 ? `€${n / 1000}k` : eurWhole(n));
const hr = (n: number) => `€${n.toFixed(2).replace(/\.00$/, '')}`;
const calcLink = (base: string, patch: Partial<Inputs>) => {
  const code = encodeInputs({ ...DEFAULT_INPUTS, ...patch });
  return `${base}${code ? `#c=${code}` : ''}`;
};

export interface PageOut {
  path: string;
  title: string;
  description: string;
  body: preact.VNode;
  jsonLd?: object[];
  crumbs: { label: string; path?: string }[];
  priority?: number;
}

/* ================================================================== */
/* /salary/45000/                                                     */
/* ================================================================== */

export function salaryPage(gross: number): PageOut {
  const base = '../../';
  const [r25, r26, r27] = YEAR_LIST.map((y) => calc(y, gross));
  const d27 = r26.totalTax - r27.totalTax;
  const label = eurWhole(gross);
  const ctx = r26.config.context;
  const vsMedian = gross / ctx.medianSalary - 1;
  const crumbs = [{ label: 'Salaries', path: '/salary/' }, { label: `${label} after tax`, path: salaryPath(gross) }];

  const family = [
    { label: 'Single', patch: {} },
    { label: 'Single parent', patch: { family: 'singleParent' as const } },
    { label: 'Married, one income', patch: { family: 'marriedOne' as const } },
    { label: 'Married, two incomes (spouse earns the same)', patch: { family: 'marriedTwo' as const, spouse: { ...DEFAULT_INPUTS.spouse, salary: gross } } },
  ];

  const faq: QA[] = [
    {
      q: `How much is ${label} after tax in Ireland?`,
      a: `In ${CURRENT}, a single PAYE employee earning ${label} takes home ${eurWhole(r26.net)} a year, which is ${m(r26.net)} a month or ${w(r26.net)} a week. In ${NEXT}, after Budget 2027, take-home pay is ${eurWhole(r27.net)} a year (${m(r27.net)} a month).`,
    },
    {
      q: `How much tax do I pay on ${label} in Ireland?`,
      a: `You pay ${eurWhole(r26.incomeTax)} Income Tax, ${eurWhole(r26.usc)} USC and ${eurWhole(r26.prsi)} PRSI in ${CURRENT}: ${eurWhole(r26.totalTax)} in total, an effective rate of ${pct(r26.effectiveRate)}. Of your next €100 of pay, ${pct(r26.marginalRate, 0)} goes in tax.`,
    },
    {
      q: `Does Budget 2027 change my pay on ${label}?`,
      a:
        d27 >= 0
          ? `Yes. You pay ${eurWhole(d27)} less tax in ${NEXT} than in ${CURRENT}, about ${eurWhole(d27 / 12)} a month, thanks to the wider standard rate band, higher tax credits and the wider USC 2% band. That figure already includes the scheduled PRSI increase.`
          : `You pay ${eurWhole(-d27)} more in ${NEXT}, because the scheduled PRSI increase outweighs the Budget 2027 tax cuts at this salary.`,
    },
    {
      q: `What is ${label} a year per hour?`,
      a: `Working ${FULL_TIME_HOURS} hours a week, ${label} is ${hr(gross / (FULL_TIME_HOURS * 52))} an hour before tax and about ${hr(r26.net / (FULL_TIME_HOURS * 52))} an hour after tax.`,
    },
  ];

  const nb = neighbours(SALARIES, gross, 5);
  const jumps = [-10000, -5000, 5000, 10000].map((d) => gross + d).filter((v) => SALARIES.includes(v) && !nb.includes(v));

  return {
    path: salaryPath(gross),
    title: `${label} after tax in Ireland: ${m(r26.net)} a month (${CURRENT} & ${NEXT})`,
    description: `On a ${label} salary in Ireland you take home ${eurWhole(r26.net)} a year (${m(r26.net)} a month) in ${CURRENT} and ${m(r27.net)} a month in ${NEXT} after Budget 2027. Full Income Tax, USC and PRSI breakdown.`,
    crumbs,
    priority: gross % 5000 === 0 ? 0.8 : 0.6,
    jsonLd: [],
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero
          eyebrow={`Salary after tax · Ireland · ${CURRENT} & Budget ${NEXT}`}
          title={
            <>
              {label} after tax in Ireland
            </>
          }
          lede={
            <>
              A {label} salary gives you <b>{eurWhole(r26.net)}</b> a year after tax in {CURRENT}: <b>{m(r26.net)} a month</b> or {w(r26.net)} a week. After Budget
              2027 that becomes <b>{m(r27.net)} a month</b> ({signedEur(d27 / 12)}).
            </>
          }
        >
          <Tiles
            items={[
              { label: `Monthly take-home ${CURRENT}`, value: m(r26.net), sub: `${w(r26.net)} a week`, accent: true },
              { label: `Monthly take-home ${NEXT}`, value: m(r27.net), sub: `${signedEur(d27)} a year` },
              { label: 'Effective tax rate', value: pct(r26.effectiveRate), sub: `${eurWhole(r26.totalTax)} a year` },
              { label: 'Marginal rate', value: pct(r26.marginalRate, 0), sub: 'on your next euro' },
            ]}
          />
          <div class="page-split">
            <SplitBar segments={segmentsFor(r26)} total={r26.gross} height={22} />
          </div>
        </PageHero>

        <div class="page-grid">
          <Section icon="calendar_month" title={`${label} after tax by pay period (${CURRENT})`}>
            <PeriodRows r={r26} />
          </Section>

          <Section icon="account_balance" title={`${label} in 2025, 2026 and 2027`} sub="Same salary, each year's Income Tax, USC and PRSI rules.">
            <YearRows rs={[r25, r26, r27]} />
          </Section>

          <Section icon="family_restroom" title={`${label} by family situation`} sub="Monthly take-home with the right band and credits for each status.">
            <DataTable
              head={['Status', `${CURRENT} / month`, `${NEXT} / month`]}
              rows={family.map((f) => ({
                cells: [f.label, m(calc(CURRENT, gross, f.patch).net), m(calc(NEXT, gross, f.patch).net)],
                highlight: f.label === 'Single',
              }))}
            />
          </Section>

          <Section icon="savings" title={`${label} with a pension`} sub="Pension contributions get tax relief at your marginal rate.">
            <PensionRows gross={gross} r={r26} />
          </Section>
        </div>

        <Breakdown r={r26} />

        <CtaBand
          href={calcLink(base, { amount: gross })}
          title="Make it yours"
          body="Add your pension, rent, bonus, overtime, medical card or spouse's income in the full calculator."
          button={`Open ${label} in the calculator`}
        />

        <Section icon="groups" title="How it compares">
          <p class="prose">
            {label} is {vsMedian >= 0 ? `${pct(vsMedian, 0)} above` : `${pct(-vsMedian, 0)} below`} the median Irish salary of {eurWhole(ctx.medianSalary)} (CSO). A full-time
            minimum wage job pays about {eurWhole(ctx.minimumWageHourly * FULL_TIME_HOURS * 52)} in {CURRENT}. Your hourly rate before tax is{' '}
            {hr(gross / (FULL_TIME_HOURS * 52))} on a {FULL_TIME_HOURS}-hour week.
          </p>
        </Section>


        <Faq items={faq} title={`${label} after tax: your questions`} />

        <Section icon="payments" title="Nearby salaries">
          <LinkGrid base={base} links={[...nb, ...jumps].sort((a, b) => a - b).map((v) => ({ path: salaryPath(v), label: eurWhole(v), sub: `${m(calc(CURRENT, v).net)}/mo` }))} />
        </Section>
        <SupportCard />
        <Sources updated={updatedLabel()} />
      </PageShell>
    ),
  };
}

function PeriodRows({ r }: { r: Result }) {
  const s = DEFAULT_INPUTS.schedule;
  const periods = [
    ['Year', 1],
    ['Month', 12],
    ['Fortnight', 26],
    ['Week', 52],
    ['Day', 52 * s.daysPerWeek],
    ['Hour', 52 * s.hoursPerWeek],
  ] as const;
  return (
    <DataTable
      head={['', 'Gross', 'Income tax', 'USC', 'PRSI', 'Take-home']}
      rows={periods.map(([label, n]) => ({
        cells: [label, eurCents(r.gross / n), eurCents(r.incomeTax / n), eurCents(r.usc / n), eurCents(r.prsi / n), <b>{eurCents(r.net / n)}</b>],
        highlight: label === 'Month',
      }))}
    />
  );
}

function YearRows({ rs }: { rs: Result[] }) {
  return (
    <DataTable
      head={['Tax year', 'Income tax', 'USC', 'PRSI', 'Take-home', 'Per month']}
      rows={rs.map((r) => ({
        cells: [
          <>
            {r.year}
            {r.config.status === 'announced' && <span class="pill-tiny">Budget</span>}
          </>,
          eurWhole(r.incomeTax),
          eurWhole(r.usc),
          eurWhole(r.prsi),
          <b>{eurWhole(r.net)}</b>,
          m(r.net),
        ],
        highlight: r.year === CURRENT,
      }))}
    />
  );
}

function PensionRows({ gross, r }: { gross: number; r: Result }) {
  const rows = [3, 5, 8, 10].map((p) => {
    const x = calc(CURRENT, gross, { pension: { type: 'percent', value: p, per: 'year' } });
    const cost = r.net - x.net;
    return { cells: [`${p}% of salary`, eurWhole(x.pensionContribution), m(x.net), eurWhole(cost), eurWhole(x.pensionContribution - cost)] };
  });
  const ae = calc(CURRENT, gross, { autoEnrolment: true });
  rows.push({
    cells: ['Auto-enrolment', eurWhole(ae.autoEnrolment.employee + ae.autoEnrolment.employer + ae.autoEnrolment.state), m(ae.net), eurWhole(r.net - ae.net), eurWhole(ae.autoEnrolment.employer + ae.autoEnrolment.state)],
  });
  return (
    <>
      <DataTable head={['Contribution', 'Into pension / yr', 'Take-home / month', 'Cost to you / yr', 'Top-up / yr']} rows={rows} />
      <p class="note">Top-up is tax relief for a personal pension, or the employer match plus State top-up for auto-enrolment (1.5% each from you and your employer, 0.5% from the State).</p>
    </>
  );
}

/* ================================================================== */
/* /hourly/15/                                                        */
/* ================================================================== */

export function hourlyPage(rate: number): PageOut {
  const base = '../../';
  const annual = rate * FULL_TIME_HOURS * 52;
  const [r25, r26, r27] = YEAR_LIST.map((y) => calc(y, annual));
  const label = `${hr(rate)} an hour`;
  const crumbs = [{ label: 'Hourly wages', path: '/hourly/' }, { label, path: hourlyPath(rate) }];
  const mins = YEAR_LIST.map((y) => ({ y, w: YEARS[y].context.minimumWageHourly }));
  const hoursRows = [20, 25, 30, 35, 39, 40].map((h) => {
    const x = calc(CURRENT, rate * h * 52);
    return { cells: [`${h} hours`, eurWhole(rate * h), eurWhole(x.net / 52), m(x.net), eurWhole(x.net)], highlight: h === FULL_TIME_HOURS };
  });
  const faq: QA[] = [
    {
      q: `How much is ${label} after tax in Ireland?`,
      a: `Full-time (${FULL_TIME_HOURS} hours a week), ${label} is ${eurWhole(annual)} a year. After Income Tax, USC and PRSI you take home ${w(r26.net)} a week or ${m(r26.net)} a month in ${CURRENT}, and ${m(r27.net)} a month in ${NEXT}.`,
    },
    {
      q: `What is ${label} per year in Ireland?`,
      a: `${label} × ${FULL_TIME_HOURS} hours × 52 weeks = ${eurWhole(annual)} gross a year.`,
    },
    {
      q: `Is ${label} above the minimum wage?`,
      a: `The national minimum wage is ${mins.map((x) => `${hr(x.w)} in ${x.y}`).join(', ')}. ${label} is ${
        rate >= mins[2].w ? 'at or above all three' : rate >= mins[1].w ? `above the ${CURRENT} rate but below the ${NEXT} rate` : rate >= mins[0].w ? `below the ${CURRENT} rate` : 'below the minimum wage'
      }.`,
    },
  ];
  const nb = neighbours(HOURLY, rate, 5);
  return {
    path: hourlyPath(rate),
    title: `${label} after tax in Ireland: ${w(r26.net)} a week (${CURRENT})`,
    description: `${label} full-time in Ireland is ${eurWhole(annual)} a year. You take home ${w(r26.net)} a week, ${m(r26.net)} a month after tax in ${CURRENT}, and ${m(r27.net)} a month in ${NEXT}. Part-time hours included.`,
    crumbs,
    priority: Number.isInteger(rate) ? 0.6 : 0.5,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero
          eyebrow={`Hourly wage after tax · Ireland · ${CURRENT} & ${NEXT}`}
          title={`${label} after tax in Ireland`}
          lede={
            <>
              Full-time at {FULL_TIME_HOURS} hours a week, {label} is <b>{eurWhole(annual)}</b> a year. You take home <b>{w(r26.net)} a week</b> or{' '}
              {m(r26.net)} a month after tax in {CURRENT}.
            </>
          }
        >
          <Tiles
            items={[
              { label: 'Weekly take-home', value: w(r26.net), sub: `${CURRENT}, ${FULL_TIME_HOURS} hrs`, accent: true },
              { label: 'Hourly after tax', value: hr(r26.net / (FULL_TIME_HOURS * 52)), sub: `from ${hr(rate)} gross` },
              { label: 'Monthly take-home', value: m(r26.net), sub: `${m(r27.net)} in ${NEXT}` },
              { label: 'Effective tax rate', value: pct(r26.effectiveRate), sub: `${eurWhole(r26.totalTax)} a year` },
            ]}
          />
        </PageHero>
        <div class="page-grid">
          <Section icon="schedule" title={`${label} by hours worked (${CURRENT})`} sub="Part-time pay is taxed on what you actually earn.">
            <DataTable head={['Hours / week', 'Gross / week', 'Net / week', 'Net / month', 'Net / year']} rows={hoursRows} />
          </Section>
          <Section icon="account_balance" title={`${label} in 2025, 2026 and 2027`} sub={`${FULL_TIME_HOURS} hours a week.`}>
            <YearRows rs={[r25, r26, r27]} />
          </Section>
        </div>
        <Breakdown r={r26} />
        <CtaBand href={calcLink(base, { amount: rate, period: 'hour' })} title="Different hours or overtime?" body="Set your own hours, overtime rates and bonus in the full calculator." button="Open in the calculator" />
        <Faq items={faq} title={`${label}: your questions`} />
        <Section icon="payments" title="Nearby hourly rates">
          <LinkGrid base={base} links={nb.map((v) => ({ path: hourlyPath(v), label: `${hr(v)}/hr`, sub: `${w(calc(CURRENT, v * FULL_TIME_HOURS * 52).net)}/wk` }))} />
          <p class="note">
            Same pay as a salary: <a href={`${base}${salaryPath(nearest(SALARIES, annual)).slice(1)}`}>{eurWhole(nearest(SALARIES, annual))} after tax</a>
          </p>
        </Section>
        <Sources updated={updatedLabel()} />
      </PageShell>
    ),
  };
}

/* ================================================================== */
/* /take-home/3000-a-month/                                           */
/* ================================================================== */

export function takeHomePage(net: number): PageOut {
  const base = '../../';
  const label = `${eurWhole(net)} a month`;
  const need = (year: TaxYear, patch: Partial<Inputs> = {}) => solveGrossForNet({ ...DEFAULT_INPUTS, year, ...patch }, net * 12);
  const g = Object.fromEntries(YEAR_LIST.map((y) => [y, need(y)])) as Record<TaxYear, number>;
  const r26 = calc(CURRENT, g[CURRENT]);
  const crumbs = [{ label: 'Net to gross', path: '/take-home/' }, { label: `${label} after tax`, path: takeHomePath(net) }];
  const statuses = [
    { label: 'Single', patch: {} },
    { label: 'Single parent', patch: { family: 'singleParent' as const } },
    { label: 'Married, one income', patch: { family: 'marriedOne' as const } },
  ];
  const faq: QA[] = [
    {
      q: `What salary do I need to take home ${label} in Ireland?`,
      a: `A single PAYE employee needs a gross salary of about ${eurWhole(g[CURRENT])} a year (${m(g[CURRENT])} a month) to take home ${label} in ${CURRENT}. In ${NEXT}, after Budget 2027, you need ${eurWhole(g[NEXT])}.`,
    },
    {
      q: `How much tax is paid on ${label} take-home?`,
      a: `On a ${eurWhole(g[CURRENT])} salary you pay ${eurWhole(r26.incomeTax)} Income Tax, ${eurWhole(r26.usc)} USC and ${eurWhole(r26.prsi)} PRSI a year in ${CURRENT}.`,
    },
    {
      q: `What is ${label} after tax per week and per year?`,
      a: `${label} take-home is ${eurWhole((net * 12) / 52)} a week, or ${eurWhole(net * 12)} a year.`,
    },
  ];
  const nb = neighbours(TAKE_HOME, net, 5);
  const nearestSalary = nearest(SALARIES, g[CURRENT]);
  return {
    path: takeHomePath(net),
    title: `${label} after tax in Ireland: you need ${eurWhole(g[CURRENT])} gross (${CURRENT})`,
    description: `To take home ${label} in Ireland you need a salary of ${eurWhole(g[CURRENT])} in ${CURRENT}, or ${eurWhole(g[NEXT])} in ${NEXT}. See the gross salary for every tax status and year.`,
    crumbs,
    priority: net % 500 === 0 ? 0.7 : 0.5,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero
          eyebrow={`Net to gross · Ireland · ${CURRENT} & ${NEXT}`}
          title={`What salary gives ${label} after tax?`}
          lede={
            <>
              To take home <b>{label}</b> in {CURRENT} you need a gross salary of <b>{eurWhole(g[CURRENT])}</b> a year ({m(g[CURRENT])} a month). After Budget 2027
              you need {eurWhole(g[NEXT])}.
            </>
          }
        >
          <Tiles
            items={[
              { label: `Gross salary needed ${CURRENT}`, value: eurWhole(g[CURRENT]), sub: `${m(g[CURRENT])} a month`, accent: true },
              { label: `Gross salary needed ${NEXT}`, value: eurWhole(g[NEXT]), sub: signedEur(g[NEXT] - g[CURRENT]) },
              { label: 'Weekly take-home', value: eurWhole((net * 12) / 52), sub: `${eurWhole(net * 12)} a year` },
              { label: 'Effective tax rate', value: pct(r26.effectiveRate), sub: `${eurWhole(r26.totalTax)} a year` },
            ]}
          />
        </PageHero>
        <div class="page-grid">
          <Section icon="family_restroom" title={`Salary needed for ${label}, by status`}>
            <DataTable
              head={['Status', ...YEAR_LIST.map(String)]}
              rows={statuses.map((s) => ({ cells: [s.label, ...YEAR_LIST.map((y) => eurWhole(need(y, s.patch)))], highlight: s.label === 'Single' }))}
            />
          </Section>
          <Section icon="calendar_month" title={`Where the tax goes (${CURRENT})`}>
            <PeriodRows r={r26} />
          </Section>
        </div>
        <CtaBand href={calcLink(base, { amount: net, period: 'month', reverse: true })} title="Work it out exactly" body="Add your pension, rent credit or spouse's income and we'll solve the salary you need." button="Open net-to-gross calculator" />
        <Faq items={faq} title={`${label} take-home: your questions`} />
        <Section icon="swap_horiz" title="Other take-home amounts">
          <LinkGrid base={base} links={nb.map((v) => ({ path: takeHomePath(v), label: `${eurWhole(v)}/mo` }))} />
          <p class="note">
            Closest salary page: <a href={`${base}${salaryPath(nearestSalary).slice(1)}`}>{eurWhole(nearestSalary)} after tax</a>
          </p>
        </Section>
        <Sources updated={updatedLabel()} />
      </PageShell>
    ),
  };
}

/* ================================================================== */
/* Hubs                                                               */
/* ================================================================== */

const BANDS = [
  [10000, 30000],
  [30500, 50000],
  [50500, 75000],
  [75500, 100000],
  [101000, 150000],
  [151000, 200000],
  [210000, 500000],
];

export function salaryHub(): PageOut {
  const base = '../';
  const crumbs = [{ label: 'Salaries', path: '/salary/' }];
  return {
    path: '/salary/',
    title: `Salary after tax in Ireland: every salary from €10k to €500k (${CURRENT} & ${NEXT})`,
    description: `Take-home pay for ${SALARIES.length} Irish salaries, from €10,000 to €500,000. Monthly net pay in ${CURRENT} and after Budget ${NEXT}, with a full tax breakdown for each.`,
    crumbs,
    priority: 0.9,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero
          eyebrow="Salary after tax · Ireland"
          title="Every salary, after tax"
          lede={`Pick a salary to see take-home pay, the full Income Tax, USC and PRSI breakdown, and what Budget ${NEXT} does to it. ${SALARIES.length} salaries, single PAYE employee.`}
        >
          <JumpForm base={base} />
        </PageHero>
        {BANDS.map(([lo, hi]) => {
          const list = SALARIES.filter((s) => s >= lo && s <= hi);
          return (
            <Section icon="payments" title={`${k(lo)} to ${k(hi)}`}>
              <DataTable
                head={['Salary', `Take-home / month ${CURRENT}`, `${NEXT}`, 'Effective rate']}
                rows={list.map((s) => {
                  const a = calc(CURRENT, s);
                  const b = calc(NEXT, s);
                  return { cells: [<a href={`${base}${salaryPath(s).slice(1)}`}>{eurWhole(s)}</a>, m(a.net), m(b.net), pct(a.effectiveRate)] };
                })}
              />
            </Section>
          );
        })}
        <Sources updated={updatedLabel()} />
      </PageShell>
    ),
  };
}

export function hourlyHub(): PageOut {
  const base = '../';
  const crumbs = [{ label: 'Hourly wages', path: '/hourly/' }];
  return {
    path: '/hourly/',
    title: `Hourly wage after tax in Ireland: €12 to €100 an hour (${CURRENT})`,
    description: `Weekly and monthly take-home pay for hourly wages from €12 to €100 in Ireland, including the minimum wage, for ${CURRENT} and ${NEXT}.`,
    crumbs,
    priority: 0.8,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero eyebrow="Hourly wage after tax · Ireland" title="Hourly wages, after tax" lede={`Full-time is ${FULL_TIME_HOURS} hours a week. Each page also shows part-time hours.`} />
        <Section icon="schedule" title="All hourly rates">
          <DataTable
            head={['Hourly rate', 'Annual gross', `Net / week ${CURRENT}`, `Net / month ${CURRENT}`, `Net / month ${NEXT}`]}
            rows={HOURLY.map((h) => {
              const a = calc(CURRENT, h * FULL_TIME_HOURS * 52);
              const b = calc(NEXT, h * FULL_TIME_HOURS * 52);
              return { cells: [<a href={`${base}${hourlyPath(h).slice(1)}`}>{hr(h)}</a>, eurWhole(h * FULL_TIME_HOURS * 52), w(a.net), m(a.net), m(b.net)] };
            })}
          />
        </Section>
        <Sources updated={updatedLabel()} />
      </PageShell>
    ),
  };
}

export function takeHomeHub(): PageOut {
  const base = '../';
  const crumbs = [{ label: 'Net to gross', path: '/take-home/' }];
  return {
    path: '/take-home/',
    title: `Net to gross salary calculator Ireland: what salary do I need? (${CURRENT})`,
    description: `The gross salary you need for every monthly take-home amount from €1,200 to €12,000 in Ireland, for ${CURRENT} and after Budget ${NEXT}.`,
    crumbs,
    priority: 0.8,
    body: (
      <PageShell base={base} crumbs={crumbs}>
        <PageHero
          eyebrow="Net to gross · Ireland"
          title="What salary do I need?"
          lede="Start from the take-home pay you want and find the gross salary that gets you there. Or use the calculator's “work backwards” switch for any amount."
        />
        <Section icon="swap_horiz" title="Monthly take-home → salary needed">
          <DataTable
            head={['Take-home / month', `Salary needed ${CURRENT}`, `${NEXT}`]}
            rows={TAKE_HOME.map((n) => ({
              cells: [
                <a href={`${base}${takeHomePath(n).slice(1)}`}>{eurWhole(n)}</a>,
                eurWhole(solveGrossForNet({ ...DEFAULT_INPUTS, year: CURRENT }, n * 12)),
                eurWhole(solveGrossForNet({ ...DEFAULT_INPUTS, year: NEXT }, n * 12)),
              ],
            }))}
          />
        </Section>
        <Sources updated={updatedLabel()} />
      </PageShell>
    ),
  };
}

/** Small "go to salary" form; works without JS (falls back to the hub). */
export function JumpForm({ base }: { base: string }) {
  return (
    <form class="jump" action={`${base}salary/`} method="get" data-jump data-base={base}>
      <label for="jump-salary" class="sr-only">
        Your salary
      </label>
      <div class="field field-md has-value">
        <div class="field-box">
          <span class="field-prefix">€</span>
          <input id="jump-salary" name="s" inputMode="numeric" placeholder="45,000" autoComplete="off" />
          <span class="field-suffix">a year</span>
        </div>
      </div>
      <button class="btn btn-filled btn-md has-icon" type="submit">
        <span class="state" />
        <span class="btn-label">See take-home</span>
      </button>
    </form>
  );
}

let UPDATED = '';
export const updatedLabel = () =>
  (UPDATED ||= new Date().toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Dublin' }));
