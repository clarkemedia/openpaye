import type { ComponentChildren } from 'preact';
import { fromAnnual, type Inputs, type Period, type Result } from '../tax/engine';
import { eur, eurCents, eurWhole, PERIOD_LABELS, pct } from '../lib/format';
import { useEffect, useState } from 'preact/hooks';
import { ButtonGroup, Icon, IconButton, NumberField, SelectField, Shape, Tip, useAnimatedNumber, type ShapeName } from './ui';
import { SplitBar, type Segment } from './charts';

export const VIZ = {
  net: 'var(--viz-net)',
  incomeTax: 'var(--viz-it)',
  usc: 'var(--viz-usc)',
  prsi: 'var(--viz-prsi)',
  pension: 'var(--viz-pension)',
  ticket: 'var(--md-outline)',
};

export type HeroView = 'you' | 'spouse' | 'household';

/** Pension, AVCs, auto-enrolment, ASC and ESPP purchases: money set aside rather than taxed */
const savingsOf = (r: Result) => r.pensionContribution + r.autoEnrolment.employee + r.asc + r.shares.esppContribution;

export function segmentsFor(r: Result): Segment[] {
  return [
    { key: 'net', label: 'Take-home', value: r.net, color: VIZ.net },
    { key: 'it', label: 'Income tax', value: r.incomeTax, color: VIZ.incomeTax },
    { key: 'usc', label: 'USC', value: r.usc, color: VIZ.usc },
    { key: 'prsi', label: 'PRSI', value: r.prsi, color: VIZ.prsi },
    { key: 'pension', label: r.asc || r.shares.esppContribution ? 'Pension & savings' : 'Pension', value: savingsOf(r), color: VIZ.pension },
    { key: 'taxSaver', label: 'TaxSaver ticket', value: r.taxSaver, color: VIZ.ticket },
  ];
}

function householdSegments(r: Result): Segment[] {
  const h = r.household!;
  return [
    { key: 'net', label: 'Take-home', value: h.combinedNet, color: VIZ.net },
    { key: 'it', label: 'Income tax', value: r.incomeTax + h.spouseIncomeTax, color: VIZ.incomeTax },
    { key: 'usc', label: 'USC', value: r.usc + h.spouseUsc, color: VIZ.usc },
    { key: 'prsi', label: 'PRSI', value: r.prsi + h.spousePrsi, color: VIZ.prsi },
    { key: 'pension', label: 'Pension & savings', value: savingsOf(r) + h.spousePension + h.spouseAutoEnrolment, color: VIZ.pension },
  ];
}

function spouseSegments(r: Result): Segment[] {
  const h = r.household!;
  return [
    { key: 'net', label: 'Take-home', value: h.spouseNet, color: VIZ.net },
    { key: 'it', label: 'Income tax', value: h.spouseIncomeTax, color: VIZ.incomeTax },
    { key: 'usc', label: 'USC', value: h.spouseUsc, color: VIZ.usc },
    { key: 'prsi', label: 'PRSI', value: h.spousePrsi, color: VIZ.prsi },
    { key: 'pension', label: 'Pension', value: h.spousePension + h.spouseAutoEnrolment, color: VIZ.pension },
  ];
}

const total = (segs: Segment[]) => segs.reduce((a, s) => a + Math.max(0, s.value), 0);
const YEAR_SHAPES: Record<number, ShapeName> = { 2025: 'cookie9', 2026: 'sunny', 2027: 'flower' };

/* ------------------------------------------------------------------ */
/* Hero: the headline number                                           */
/* ------------------------------------------------------------------ */

export function Hero(props: {
  r: Result;
  /** Result without the bonus, when the bonus is kept separate */
  regular: Result | null;
  inputs: Inputs;
  set: (patch: Partial<Inputs>) => void;
  display: Period;
  setDisplay: (p: Period) => void;
  view: HeroView;
  setView: (v: HeroView) => void;
}) {
  const { r, regular, inputs, display, view } = props;
  const s = inputs.schedule;
  const h = r.household;
  const v: HeroView = h ? view : 'you';
  const base = regular ?? r;
  const bonusNet = regular ? r.net - regular.net : 0;

  const netA = v === 'spouse' ? h!.spouseNet : v === 'household' ? h!.combinedNet - bonusNet : base.net;
  const grossA = v === 'spouse' ? h!.spouseGross : v === 'household' ? h!.combinedGross - (regular ? r.bonus : 0) : base.gross + base.otherIncomeTotal;
  const taxA = v === 'spouse' ? h!.spouseIncomeTax + h!.spouseUsc + h!.spousePrsi : v === 'household' ? h!.combinedTax : base.totalTax;
  const segs = v === 'spouse' ? spouseSegments(r) : v === 'household' ? householdSegments(r) : segmentsFor(base);

  const anim = useAnimatedNumber(fromAnnual(netA, display, s));
  const keepPerEuro = grossA > 0 ? netA / grossA : 0;
  const [euros, cents] = eurCents(anim).split('.');
  const kicker = v === 'spouse' ? "Your spouse's take-home" : v === 'household' ? 'Household take-home' : 'Your take-home pay';
  const payslipOn = inputs.payslipMode;

  return (
    <section class="card hero" id="result" aria-live="polite" aria-label={kicker}>
      <div class="hero-shapes" aria-hidden="true">
        <Shape name={YEAR_SHAPES[inputs.year]} class="hero-shape a" />
        <Shape name={inputs.year === 2027 ? 'cookie12' : 'clover'} class="hero-shape b" />
      </div>
      <div class="hero-top">
        <span class="hero-kicker">
          <Icon name="wallet" size={18} /> {kicker} · {inputs.year}
          {r.config.status === 'announced' && <span class="pill-tiny">Budget 2027</span>}
        </span>
        <ButtonGroup
          label="Show amounts"
          size="sm"
          class="hero-periods"
          value={display}
          onChange={props.setDisplay}
          options={(['year', 'month', 'fortnight', 'week'] as Period[]).map((p) => ({ value: p, label: PERIOD_LABELS[p].short }))}
        />
      </div>
      {h && (
        <ButtonGroup
          label="Whose pay"
          size="sm"
          class="hero-view"
          value={v}
          onChange={props.setView}
          options={[
            { value: 'you', label: 'You' },
            { value: 'spouse', label: 'Spouse' },
            { value: 'household', label: 'Household' },
          ]}
        />
      )}
      <div class="hero-number">
        <span class="hero-euros">{euros}</span>
        <span class="hero-cents">.{cents}</span>
        <span class="hero-per">{PERIOD_LABELS[display].per}</span>
      </div>
      <p class="hero-sub">
        from <b>{eur(fromAnnual(grossA, display, s), display !== 'year')}</b> gross{inputs.reverse && v === 'you' && ' (solved from your take-home)'}
        {regular && ', not counting your bonus'}. {v === 'spouse' ? 'They keep' : 'You keep'} <b>{Math.round(keepPerEuro * 100)}c</b> of every euro.
      </p>
      <div class="hero-chips">
        {v === 'you' ? (
          <>
            <span class="stat-chip">
              <span class="stat-chip-label">
                Effective tax rate <Tip>Income tax + USC + PRSI as a share of your total income. Pension contributions are your savings, not tax.</Tip>
              </span>
              <span class="stat-chip-value">{pct(base.effectiveRate)}</span>
            </span>
            <span class="stat-chip">
              <span class="stat-chip-label">
                Marginal rate <Tip>How much of your next euro of salary goes in tax.</Tip>
              </span>
              <span class="stat-chip-value">{pct(r.marginalRate)}</span>
            </span>
          </>
        ) : (
          <span class="stat-chip">
            <span class="stat-chip-label">Effective tax rate</span>
            <span class="stat-chip-value">{pct(grossA > 0 ? taxA / grossA : 0)}</span>
          </span>
        )}
        <span class="stat-chip">
          <span class="stat-chip-label">Total tax {PERIOD_LABELS[display].per}</span>
          <span class="stat-chip-value">{eur(fromAnnual(taxA, display, s), display !== 'year')}</span>
        </span>
        {regular && bonusNet > 0 && (
          <span class="stat-chip">
            <span class="stat-chip-label">Bonus after tax</span>
            <span class="stat-chip-value">{eurWhole(bonusNet)}</span>
          </span>
        )}
      </div>
      <SplitBar segments={segs} total={total(segs)} height={28} format={(n) => eur(fromAnnual(n, display, s), display !== 'year')} />
      <button
        type="button"
        class={`payslip-toggle ${payslipOn ? 'on' : ''}`}
        aria-pressed={payslipOn}
        onClick={() => props.set({ payslipMode: !payslipOn })}
        title="PRSI rises every October. Payslip mode uses the rate on your payslip right now instead of the yearly average."
      >
        <Icon name={payslipOn ? 'check' : 'receipt_long'} size={16} />
        {payslipOn && r.payslipRate ? `Payslip mode: PRSI at ${pct(r.payslipRate.rate, 2)} (from ${r.payslipRate.from})` : 'Match my payslip this month'}
      </button>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Period table                                                        */
/* ------------------------------------------------------------------ */

export function PeriodTable({ r, inputs, bonusNet }: { r: Result; inputs: Inputs; bonusNet?: number }) {
  const periods: Period[] = ['year', 'month', 'fortnight', 'week', 'day', 'hour'];
  const nonCash = r.bik + r.shares.esppBenefit + r.shares.apss + r.shares.rsu;
  const rows: { label: ComponentChildren; v: number; strong?: boolean; color?: string; neg?: boolean; hide?: boolean }[] = [
    { label: 'Gross pay', v: r.gross, strong: true },
    { label: 'TaxSaver ticket (before tax)', v: r.taxSaver, color: VIZ.ticket, neg: true, hide: r.taxSaver === 0 },
    { label: 'Other income', v: r.otherIncomeTotal, hide: r.otherIncomeTotal === 0 },
    { label: 'Benefits & shares (taxed, not paid)', v: nonCash, hide: nonCash === 0 },
    { label: 'Income tax', v: r.incomeTax, color: VIZ.incomeTax, neg: true },
    { label: 'USC', v: r.usc, color: VIZ.usc, neg: true },
    { label: 'PRSI', v: r.prsi, color: VIZ.prsi, neg: true },
    { label: 'Tax covered by selling RSUs', v: r.shares.rsuTax, hide: !r.shares.sellToCover || r.shares.rsuTax === 0 },
    { label: 'Pension & AVCs', v: r.pensionContribution, color: VIZ.pension, neg: true, hide: r.pensionContribution === 0 },
    { label: 'Auto-enrolment', v: r.autoEnrolment.employee, color: VIZ.pension, neg: true, hide: r.autoEnrolment.employee === 0 },
    { label: 'ASC', v: r.asc, color: VIZ.pension, neg: true, hide: r.asc === 0 },
    { label: 'ESPP share purchases', v: r.shares.esppContribution, color: VIZ.pension, neg: true, hide: r.shares.esppContribution === 0 },
    { label: 'Take-home pay', v: r.net, strong: true, color: VIZ.net },
  ];
  return (
    <section class="card" aria-labelledby="pt-h">
      <div class="card-head">
        <h2 id="pt-h" class="card-title">
          <Icon name="calendar_month" /> Every pay period
        </h2>
      </div>
      <div class="table-scroll">
        <table class="ptable">
          <thead>
            <tr>
              <th />
              {periods.map((p) => (
                <th scope="col">{PERIOD_LABELS[p].short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows
              .filter((x) => !x.hide)
              .map((row) => (
                <tr class={row.strong ? 'strong' : ''}>
                  <th scope="row">
                    {row.color && <span class="legend-swatch" style={{ background: row.color }} />}
                    {row.label}
                  </th>
                  {periods.map((p) => {
                    const v = fromAnnual(row.v, p, inputs.schedule);
                    return (
                      <td>
                        {row.neg && v > 0 ? '−' : ''}
                        {eur(v, p !== 'year')}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p class="note">
        {bonusNet ? `Your bonus is shown separately: ${eurWhole(bonusNet)} after tax, paid as a lump sum. ` : ''}
        {inputs.payslipMode ? 'Using the PRSI rate in force now. ' : ''}
        Weekly figures assume {inputs.schedule.weeksPerYear} paid weeks, daily {inputs.schedule.daysPerWeek} days a week, hourly {inputs.schedule.hoursPerWeek} hours a week.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Breakdown: show the maths                                           */
/* ------------------------------------------------------------------ */

function Line(props: { label: ComponentChildren; value: ComponentChildren; sub?: boolean; strong?: boolean; muted?: boolean }) {
  return (
    <div class={`bline ${props.sub ? 'sub' : ''} ${props.strong ? 'strong' : ''} ${props.muted ? 'muted' : ''}`}>
      <span class="bline-label">{props.label}</span>
      <span class="bline-value">{props.value}</span>
    </div>
  );
}

const range = (a: number, b: number) => (b === Infinity ? `above ${eurWhole(a)}` : `${eurWhole(a)} – ${eurWhole(b)}`);
const withHint = (label: string, hint?: string) => (
  <>
    {label}
    {hint && <span class="bline-hint"> · {hint}</span>}
  </>
);

export function Breakdown({ r }: { r: Result }) {
  const cfg = r.config;
  const sh = r.shares;
  return (
    <section class="card" aria-labelledby="bd-h">
      <div class="card-head">
        <h2 id="bd-h" class="card-title">
          <Icon name="calculate" /> Show me the maths
        </h2>
        <span class="card-sub">Every step, line by line, the way Revenue works it out.</span>
      </div>

      <div class="bgroup">
        <h3 class="bgroup-title">
          <span class="legend-swatch" style={{ background: VIZ.net }} /> Your income
        </h3>
        <Line label="Basic salary" value={eurCents(r.baseSalary)} />
        {r.overtime > 0 && <Line label="Overtime" value={eurCents(r.overtime)} />}
        {r.bonus > 0 && <Line label="Bonus / commission" value={eurCents(r.bonus)} />}
        {r.taxSaver > 0 && <Line label={withHint('TaxSaver ticket', 'salary sacrifice, no tax on it')} value={`−${eurCents(r.taxSaver)}`} />}
        {r.bikLines.map((l) => (
          <Line label={withHint(`${l.label} (benefit-in-kind)`, l.hint)} value={eurCents(l.amount)} />
        ))}
        {sh.esppBenefit > 0 && <Line label="ESPP discount (taxed as pay)" value={eurCents(sh.esppBenefit)} />}
        {sh.rsu > 0 && <Line label="RSUs vesting" value={eurCents(sh.rsu)} />}
        {sh.apss > 0 && <Line label="Shares through APSS" value={eurCents(sh.apss)} />}
        {sh.apssTaxFree > 0 && <Line sub muted label="APSS shares free of Income Tax (USC and PRSI still apply)" value={`−${eurCents(sh.apssTaxFree)}`} />}
        {r.otherIncome.map((l) => (
          <Line label={withHint(l.label, l.hint)} value={eurCents(l.amount)} />
        ))}
        {r.pensionRelieved > 0 && (
          <Line label={`Pension and AVCs relieved (limit ${pct(r.pensionLimitPct, 0)} = ${eurWhole(r.pensionLimit)})`} value={`−${eurCents(r.pensionRelieved)}`} />
        )}
        {r.pensionContribution > r.pensionRelieved + 0.005 && (
          <Line muted sub label="Above your age limit, so no tax relief" value={eurCents(r.pensionContribution - r.pensionRelieved)} />
        )}
        {r.deductions.map((d) => (
          <Line label={withHint(d.label, d.hint)} value={`−${eurCents(d.amount)}`} />
        ))}
        <Line strong label="Taxable income" value={eurCents(r.taxableIncome)} />
      </div>

      <div class="bgroup">
        <h3 class="bgroup-title">
          <span class="legend-swatch" style={{ background: VIZ.incomeTax }} /> Income tax
        </h3>
        <Line sub label={`20% on ${eurWhole(Math.min(r.taxableIncome, r.band))} (your band is ${eurWhole(r.band)})`} value={eurCents(r.taxAtStandard)} />
        <Line sub label={`40% on ${eurWhole(Math.max(0, r.taxableIncome - r.band))}`} value={eurCents(r.taxAtHigher)} />
        <Line label="Gross tax" value={eurCents(r.grossTax)} />
        {r.credits.map((c) => (
          <Line sub label={withHint(c.label, c.hint)} value={`−${eurCents(c.amount)}`} />
        ))}
        {r.creditsTotal > r.grossTax + 0.005 && <Line muted sub label="Unused credits (credits can't create a refund)" value={eurCents(r.creditsTotal - r.grossTax)} />}
        {r.ageExemptionApplied && <Line sub muted label="Age exemption (65+) applied" value="✓" />}
        <Line strong label="Income tax due" value={eurCents(r.incomeTax)} />
      </div>

      <div class="bgroup">
        <h3 class="bgroup-title">
          <span class="legend-swatch" style={{ background: VIZ.usc }} /> Universal Social Charge
        </h3>
        {r.uscExempt ? (
          <Line sub label={`Exempt: income of ${eurWhole(cfg.usc.exemptionThreshold)} or less`} value={eurCents(0)} />
        ) : (
          r.uscLines.map((l) => <Line sub label={`${pct(l.rate)} on ${range(l.from, l.to)}`} value={eurCents(l.amount)} />)
        )}
        {r.uscSurcharge > 0 && <Line sub label="3% surcharge on non-PAYE income over €100,000" value={eurCents(r.uscSurcharge)} />}
        {r.uscReduced && <Line sub muted label="Reduced rates (medical card / 70+)" value="✓" />}
        {r.otherIncome.some((l) => l.key === 'statePension') && <Line sub muted label="State pension: no USC" value="✓" />}
        <Line strong label="USC due" value={eurCents(r.usc)} />
      </div>

      <div class="bgroup">
        <h3 class="bgroup-title">
          <span class="legend-swatch" style={{ background: VIZ.prsi }} /> PRSI (Class {r.prsiClass})
        </h3>
        {r.prsiExempt ? (
          <Line
            sub
            label={r.prsiLines.length === 0 && r.gross + r.bik > cfg.prsi.weeklyExemption * 52 ? 'Exempt: age 66+' : `Exempt: €${cfg.prsi.weeklyExemption} a week or less`}
            value={eurCents(0)}
          />
        ) : (
          r.prsiLines.map((l) => (
            <Line
              sub
              label={l.share === 1 ? `${pct(l.rate, 2)} (rate in force now)` : `${pct(l.rate, 2)} from ${l.from} (${Math.round(l.share * 12)} months)`}
              value={eurCents(l.amount)}
            />
          ))
        )}
        {r.prsiClass === 'D' && <Line sub muted label="Class D: lower rate on the first €1,443 a week" value="✓" />}
        {r.prsiCredit > 0 && <Line sub muted label="PRSI credit (low earnings taper) included" value={`−${eurCents(r.prsiCredit)}`} />}
        {r.prsiOther.map((l) => (
          <Line sub label={l.label} value={eurCents(l.amount)} />
        ))}
        <Line strong label="PRSI due" value={eurCents(r.prsi)} />
      </div>

      {(r.pensionContribution > 0 || r.autoEnrolment.employee > 0 || r.asc > 0 || sh.esppContribution > 0 || sh.sellToCover) && (
        <div class="bgroup">
          <h3 class="bgroup-title">
            <span class="legend-swatch" style={{ background: VIZ.pension }} /> Pension, savings and shares
          </h3>
          {r.pensionMain > 0 && <Line sub label="Your pension contribution" value={eurCents(r.pensionMain)} />}
          {r.avc > 0 && <Line sub label={r.bonusToPension > 0 ? `AVCs (including ${eurWhole(r.bonusToPension)} of your bonus)` : 'AVCs'} value={eurCents(r.avc)} />}
          {r.pensionContribution + 0.005 < r.pensionRequested && (
            <Line sub muted label="Capped at the tax relief limit" value={`−${eurCents(r.pensionRequested - r.pensionContribution)}`} />
          )}
          {r.autoEnrolment.employee > 0 && <Line sub label="Auto-enrolment (deducted after tax)" value={eurCents(r.autoEnrolment.employee)} />}
          {r.asc > 0 && <Line sub label="Additional Superannuation Contribution" value={eurCents(r.asc)} />}
          {sh.esppContribution > 0 && <Line sub label={`ESPP purchases (shares worth ${eurWhole(sh.esppSharesValue)})`} value={eurCents(sh.esppContribution)} />}
          {sh.sellToCover && <Line sub label="RSU tax paid by selling shares, not from your salary" value={`+${eurCents(sh.rsuTax)}`} />}
        </div>
      )}

      {r.taxSaver > 0 && (
        <div class="bgroup">
          <h3 class="bgroup-title">
            <span class="legend-swatch" style={{ background: VIZ.ticket }} /> TaxSaver ticket
          </h3>
          <Line sub label="Taken from your pay before tax" value={eurCents(r.taxSaver)} />
        </div>
      )}

      <div class="bgroup total">
        <Line strong label="Total deductions" value={eurCents(r.totalDeductions)} />
        <Line strong label={r.otherIncomeTotal > 0 ? 'Take-home (pay and other income)' : 'Take-home pay'} value={eurCents(r.net)} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Floating mini calculator: shows whenever the main result is off screen */
/* ------------------------------------------------------------------ */

export function StickyResult(props: { net: number; effectiveRate: number; inputs: Inputs; display: Period; set: (p: Partial<Inputs>) => void }) {
  const { inputs, display, set } = props;
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const el = document.getElementById('result');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const visible = show || open;
  return (
    <div class={`sticky-result ${visible ? 'show' : ''} ${open ? 'open' : ''}`} aria-hidden={!visible}>
      {open && (
        <div class="sticky-editor">
          <NumberField
            label={inputs.reverse ? 'Take-home' : 'Salary'}
            prefix="€"
            value={inputs.amount}
            step={inputs.period === 'year' ? 1000 : 50}
            onChange={(amount) => set({ amount })}
          />
          <SelectField
            label="Per"
            value={inputs.period}
            options={(['year', 'month', 'fortnight', 'week', 'day', 'hour'] as Period[]).map((p) => ({ value: p, label: PERIOD_LABELS[p].short }))}
            onChange={(period) => set({ period })}
          />
        </div>
      )}
      <div class="sticky-bar">
        <button
          type="button"
          class="sticky-result-main"
          tabIndex={visible ? 0 : -1}
          onClick={() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          aria-label="Back to your full result"
        >
          <span class="sticky-result-text">
            <span class="sticky-result-label">Take-home</span>
            <span class="sticky-result-value">
              {eur(fromAnnual(props.net, display, inputs.schedule), display !== 'year')} <small>{PERIOD_LABELS[display].per}</small>
            </span>
          </span>
          <span class="sticky-result-meta">tax {pct(props.effectiveRate, 0)}</span>
        </button>
        <IconButton icon={open ? 'close' : 'tune'} label={open ? 'Close quick edit' : 'Change salary here'} variant="tonal" onClick={() => setOpen(!open)} />
      </div>
    </div>
  );
}
