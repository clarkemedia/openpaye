import { useMemo, useState } from 'preact/hooks';
import { calculateForSalary, type Inputs, type Result } from '../tax/engine';
import { YEAR_LIST, YEARS } from '../tax/years';
import { eurWhole, pct, signedEur } from '../lib/format';
import { CompareBars, SplitBar, TakeHomeCurve, type CurvePoint } from './charts';
import { Icon, NumberField, Shape } from './ui';
import { VIZ } from './results';

/* ------------------------------------------------------------------ */
/* Budget comparison                                                   */
/* ------------------------------------------------------------------ */

export function BudgetCompare({ inputs, r }: { inputs: Inputs; r: Result }) {
  const results = useMemo(
    () => YEAR_LIST.map((year) => calculateForSalary({ ...inputs, year }, r.baseSalary)),
    [inputs, r.baseSalary],
  );
  const [y25, y26, y27] = results;
  // Compare tax only: pension and auto-enrolment are savings, not tax
  const d27 = y26.totalTax - y27.totalTax;
  const d26 = y25.totalTax - y26.totalTax;

  return (
    <section class="card insight span-2" aria-labelledby="bc-h">
      <div class="card-head">
        <h2 id="bc-h" class="card-title">
          <Icon name="account_balance" /> What the Budgets did to your pay
        </h2>
        <span class="card-sub">Same salary and options, run through each year's rules. Positive means less tax for you.</span>
      </div>
      <div class="budget-hero">
        <div class="budget-delta">
          <span class="budget-delta-label">Budget 2027 vs 2026</span>
          <span class={`budget-delta-value ${d27 >= 0 ? 'up' : 'down'}`}>
            <Icon name={d27 >= 0 ? 'trending_up' : 'trending_down'} size={28} />
            {signedEur(d27)}
            <small>/year</small>
          </span>
          <span class="budget-delta-sub">{signedEur(d27 / 12)} a month</span>
        </div>
        <div class="budget-delta">
          <span class="budget-delta-label">Budget 2026 vs 2025</span>
          <span class={`budget-delta-value ${d26 >= 0 ? 'up' : 'down'}`}>
            <Icon name={d26 >= 0 ? 'trending_up' : 'trending_down'} size={28} />
            {signedEur(d26)}
            <small>/year</small>
          </span>
          <span class="budget-delta-sub">{signedEur(d26 / 12)} a month</span>
        </div>
      </div>
      <div class="year-table">
        <div class="yt-row yt-head">
          <span>Tax year</span>
          <span>Income tax</span>
          <span>USC</span>
          <span>PRSI</span>
          <span>Total tax</span>
        </div>
        {results.map((x) => (
          <div class={`yt-row ${x.year === inputs.year ? 'current' : ''}`}>
            <span class="yt-year">
              {x.year}
              {x.config.status === 'announced' && <span class="pill-tiny">announced</span>}
            </span>
            <span>{eurWhole(x.incomeTax)}</span>
            <span>{eurWhole(x.usc)}</span>
            <span>{eurWhole(x.prsi)}</span>
            <span class="yt-net">{eurWhole(x.totalTax)}</span>
          </div>
        ))}
      </div>
      <p class="note">{YEARS[2027].note}</p>
      {y27.prsi > y26.prsi && (
        <p class="note">
          PRSI keeps rising each October under the Social Welfare Act. That's{' '}
          <b>{eurWhole(y27.prsi - y26.prsi)}</b> more PRSI for you in 2027.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Next €100                                                           */
/* ------------------------------------------------------------------ */

export function NextHundred({ r }: { r: Result }) {
  const m = r.marginal;
  const keep = Math.max(0, 100 * (1 - r.marginalRate));
  return (
    <section class="card insight" aria-labelledby="nh-h">
      <h2 id="nh-h" class="card-title">
        <Icon name="bolt" /> Your next €100
      </h2>
      <div class="big-stat">
        <span class="big-stat-value">€{keep.toFixed(0)}</span>
        <span class="big-stat-label">is what you'd keep from a €100 pay rise</span>
      </div>
      <SplitBar
        total={100}
        format={(n) => `€${n.toFixed(2)}`}
        segments={[
          { key: 'net', label: 'You keep', value: keep, color: VIZ.net },
          { key: 'it', label: 'Income tax', value: m.incomeTax * 100, color: VIZ.incomeTax },
          { key: 'usc', label: 'USC', value: m.usc * 100, color: VIZ.usc },
          { key: 'prsi', label: 'PRSI', value: m.prsi * 100, color: VIZ.prsi },
        ]}
      />
      <p class="note">
        {r.taxableIncome > r.band
          ? `You're in the 40% band. €${eurWhole(r.taxableIncome - r.band).slice(1)} of your income is taxed at the higher rate.`
          : `You're €${eurWhole(r.band - r.taxableIncome).slice(1)} below the 40% band.`}
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Tax freedom day                                                     */
/* ------------------------------------------------------------------ */

export function TaxFreedom({ r, inputs }: { r: Result; inputs: Inputs }) {
  const days = Math.round(r.effectiveRate * 365);
  const date = new Date(Date.UTC(inputs.year, 0, 1 + days));
  const label = date.toLocaleDateString('en-IE', { day: 'numeric', month: 'long', timeZone: 'UTC' });
  const hours = inputs.schedule.hoursPerWeek * r.effectiveRate;
  const workdays = Math.round(r.effectiveRate * inputs.schedule.weeksPerYear * inputs.schedule.daysPerWeek);
  return (
    <section class="card insight freedom" aria-labelledby="tf-h">
      <h2 id="tf-h" class="card-title">
        <Icon name="celebration" /> Your tax freedom day
      </h2>
      <div class="freedom-date">
        <Shape name="cookie9" class="freedom-shape" />
        <span class="freedom-text">
          <span class="freedom-day">{date.getUTCDate()}</span>
          <span class="freedom-month">{date.toLocaleDateString('en-IE', { month: 'short', timeZone: 'UTC' })}</span>
        </span>
      </div>
      <p class="insight-text">
        If every euro you earned from 1 January went straight to tax, you'd be working for yourself from <b>{label}</b>.
      </p>
      <ul class="facts">
        <li>
          <b>{workdays}</b> working days a year go to tax
        </li>
        <li>
          <b>{hours.toFixed(1)} hours</b> of a {inputs.schedule.hoursPerWeek}-hour week
        </li>
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* How you compare                                                     */
/* ------------------------------------------------------------------ */

export function VsMedian({ r, inputs }: { r: Result; inputs: Inputs }) {
  const ctx = r.config.context;
  const minWageAnnual = ctx.minimumWageHourly * 39 * 52;
  const vs = r.gross / ctx.medianSalary - 1;
  const rows = [
    { label: `Full-time minimum wage (€${ctx.minimumWageHourly.toFixed(2)}/hr)`, value: minWageAnnual },
    { label: 'Median earnings', value: ctx.medianSalary },
    { label: 'Average earnings', value: ctx.meanSalary },
    { label: 'You', value: r.gross, highlight: true },
  ].sort((a, b) => a.value - b.value);
  const medianNet = calculateForSalary({ ...inputs, family: 'single', pension: { ...inputs.pension, value: 0 }, overtime: [], bonus: { ...inputs.bonus, value: 0 }, autoEnrolment: false, health: { ...inputs.health, enabled: false }, rent: { ...inputs.rent, enabled: false }, mortgage: { ...inputs.mortgage, enabled: false }, otherCredits: 0 }, ctx.medianSalary).net;
  return (
    <section class="card insight" aria-labelledby="vm-h">
      <h2 id="vm-h" class="card-title">
        <Icon name="groups" /> How you compare
      </h2>
      <div class="big-stat">
        <span class="big-stat-value">{vs >= 0 ? `+${pct(vs, 0)}` : `−${pct(-vs, 0)}`}</span>
        <span class="big-stat-label">{vs >= 0 ? 'above' : 'below'} the median Irish salary</span>
      </div>
      <CompareBars rows={rows} />
      <p class="note">
        A single person on the median salary takes home {eurWhole(medianNet)} in {inputs.year}. Median and average from the {ctx.medianSource}; minimum wage from gov.ie.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Take-home curve                                                     */
/* ------------------------------------------------------------------ */

export function CurveCard({ r, inputs }: { r: Result; inputs: Inputs }) {
  const points = useMemo(() => {
    const top = Math.max(150000, Math.ceil((r.baseSalary * 1.6) / 50000) * 50000);
    const n = 120;
    const pts: CurvePoint[] = [];
    for (let i = 0; i <= n; i++) {
      const base = (top * i) / n;
      const x = calculateForSalary(inputs, base);
      pts.push({ gross: x.gross, net: x.net, rate: x.effectiveRate });
    }
    // Normalise x-axis to gross pay
    return pts.filter((p) => p.gross <= pts[pts.length - 1].gross);
  }, [inputs, r.baseSalary]);

  return (
    <section class="card insight span-2" aria-labelledby="cc-h">
      <div class="card-head">
        <h2 id="cc-h" class="card-title">
          <Icon name="show_chart" /> Take-home across every salary
        </h2>
        <span class="card-sub">The gap between the lines is tax. Hover to explore. Your options are applied throughout.</span>
      </div>
      <TakeHomeCurve points={points} you={{ gross: r.gross, net: r.net, rate: r.effectiveRate }} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* What-ifs                                                            */
/* ------------------------------------------------------------------ */

export function WhatIf({ r, inputs }: { r: Result; inputs: Inputs }) {
  const [raise, setRaise] = useState(5000);
  const [extraPension, setExtraPension] = useState(100);

  const raised = useMemo(() => calculateForSalary(inputs, r.baseSalary + raise), [inputs, r.baseSalary, raise]);
  const pensionInputs: Inputs = useMemo(() => {
    const currentAnnual = r.pensionContribution;
    return { ...inputs, pension: { type: 'fixed', value: currentAnnual + extraPension * 12, per: 'year' } } as Inputs;
  }, [inputs, r.pensionContribution, extraPension]);
  const withPension = useMemo(() => calculateForSalary(pensionInputs, r.baseSalary), [pensionInputs, r.baseSalary]);

  const raiseGain = raised.net - r.net;
  const pensionCost = (r.net - withPension.net) / 12;
  const govt = extraPension - pensionCost;

  return (
    <section class="card insight span-2" aria-labelledby="wi-h">
      <div class="card-head">
        <h2 id="wi-h" class="card-title">
          <Icon name="lightbulb" /> What if…
        </h2>
      </div>
      <div class="whatif-grid">
        <div class="whatif">
          <NumberField label="I got a pay rise of" prefix="€" suffix="per year" value={raise} step={500} onChange={setRaise} />
          <div class="whatif-result">
            <span class="whatif-big">{signedEur(raiseGain)}</span>
            <span>
              a year in your pocket, or {signedEur(raiseGain / 12)} a month. You keep {raise > 0 ? pct(raiseGain / raise, 0) : '—'} of the rise.
            </span>
          </div>
        </div>
        <div class="whatif">
          <NumberField label="I put extra into my pension" prefix="€" suffix="per month" value={extraPension} step={25} onChange={setExtraPension} />
          <div class="whatif-result">
            <span class="whatif-big">{eurWhole(pensionCost)}</span>
            <span>
              is all it costs from your take-home each month. Tax relief covers the other <b>{eurWhole(govt)}</b>
              {withPension.pensionContribution > withPension.pensionLimit + 0.5 && ' (part of this is over your age limit and gets no relief)'}.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Auto-enrolment                                                      */
/* ------------------------------------------------------------------ */

export function AutoEnrolmentCard({ r }: { r: Result }) {
  const cfg = r.config.autoEnrolment;
  const on = r.autoEnrolment.employee > 0;
  const base = Math.min(r.gross, cfg.earningsCap);
  const rates = cfg.available ? cfg : { employeeRate: 0.015, employerRate: 0.015, stateRate: 0.005 };
  const ae = on
    ? r.autoEnrolment
    : { employee: base * rates.employeeRate, employer: base * rates.employerRate, state: base * rates.stateRate };
  const total = ae.employee + ae.employer + ae.state;
  return (
    <section class="card insight" aria-labelledby="ae-h">
      <h2 id="ae-h" class="card-title">
        <Icon name="savings" /> My Future Fund
      </h2>
      <div class="big-stat">
        <span class="big-stat-value">{eurWhole(total)}</span>
        <span class="big-stat-label">{on ? 'into your retirement pot this year' : 'a year would go into your pot if you join'}</span>
      </div>
      <CompareBars
        rows={[
          { label: 'You', value: ae.employee, highlight: true },
          { label: 'Your employer', value: ae.employer },
          { label: 'The State', value: ae.state },
        ]}
      />
      {!on && (
        <p class="ae-off">
          {cfg.available
            ? r.autoEnrolment.eligible
              ? "You'll be enrolled automatically unless you already have a workplace pension. Turn it on under Pension to see the effect on your pay."
              : 'You can opt in even if you are not enrolled automatically (aged 23–60 and earning €20,000+).'
            : 'Auto-enrolment starts on 1 January 2026.'}
        </p>
      )}
      <p class="note">
        Every €1 you put in becomes €{(total / Math.max(ae.employee, 0.01)).toFixed(2)} in your pot. Contribution rates step up every three years, reaching 6% each from you and your employer by year 10.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Credits people often miss                                           */
/* ------------------------------------------------------------------ */

export function MissingCredits({ r, inputs }: { r: Result; inputs: Inputs }) {
  const c = r.config.credits;
  const items: { icon: Parameters<typeof Icon>[0]['name']; title: string; body: string }[] = [];
  if (!inputs.rent.enabled)
    items.push({ icon: 'apartment', title: `Rent Tax Credit: up to ${eurWhole(c.rentSingle)}`, body: 'Renting privately, or paying rent for a student child? Claim it in myAccount, even for past years.' });
  items.push({ icon: 'work', title: 'Flat-rate expenses', body: 'Nurses, teachers, retail, construction and hundreds of other jobs get an automatic deduction for work costs.' });
  items.push({ icon: 'medical_services', title: 'Medical expenses: 20% back', body: 'GP visits, prescriptions, physio and more. Claim through myAccount up to four years back.' });
  items.push({ icon: 'home', title: 'Remote working relief', body: '30% of heat, electricity and broadband for the days you work from home.' });
  items.push({ icon: 'school', title: 'Tuition fees', body: '20% relief on qualifying third-level fees, for you or someone you pay for.' });
  return (
    <section class="card insight" aria-labelledby="mc-h">
      <h2 id="mc-h" class="card-title">
        <Icon name="lightbulb" /> Credits people often miss
      </h2>
      <ul class="missing">
        {items.slice(0, 5).map((i) => (
          <li>
            <Icon name={i.icon} size={20} />
            <span>
              <b>{i.title}</b>
              {i.body}
            </span>
          </li>
        ))}
      </ul>
      <p class="note">
        Many workers never claim credits they are entitled to. Claiming yourself is free in <a href="https://www.revenue.ie/en/online-services/services/manage-your-record/myaccount.aspx" target="_blank" rel="noopener">myAccount on revenue.ie</a>.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Household                                                           */
/* ------------------------------------------------------------------ */

export function HouseholdCard({ r }: { r: Result }) {
  const h = r.household!;
  return (
    <section class="card insight" aria-labelledby="hh-h">
      <h2 id="hh-h" class="card-title">
        <Icon name="family_restroom" /> Your household
      </h2>
      <div class="big-stat">
        <span class="big-stat-value">{eurWhole(h.combinedNet)}</span>
        <span class="big-stat-label">combined take-home per year · {eurWhole(h.combinedNet / 12)}/month</span>
      </div>
      <CompareBars
        rows={[
          { label: 'Your take-home', value: r.net, highlight: true },
          { label: "Spouse's take-home", value: h.spouseNet },
        ]}
      />
      <p class="note">
        Spouse: income tax {eurWhole(h.spouseIncomeTax)}, USC {eurWhole(h.spouseUsc)}, PRSI {eurWhole(h.spousePrsi)}. Joint assessment lets you share a standard rate band of up to{' '}
        {eurWhole(r.config.incomeTax.bands.marriedOneIncome + r.config.incomeTax.bands.marriedSecondIncomeIncrease)}.
      </p>
    </section>
  );
}
