import type { ComponentChildren } from 'preact';
import { fromAnnual, type Inputs, type Period, type Result } from '../tax/engine';
import { eur, eurCents, eurWhole, PERIOD_LABELS, pct } from '../lib/format';
import { useEffect, useState } from 'preact/hooks';
import { ButtonGroup, Icon, Shape, Tip, useAnimatedNumber, type ShapeName } from './ui';
import { SplitBar, type Segment } from './charts';

export const VIZ = {
  net: 'var(--viz-net)',
  incomeTax: 'var(--viz-it)',
  usc: 'var(--viz-usc)',
  prsi: 'var(--viz-prsi)',
  pension: 'var(--viz-pension)',
};

export function segmentsFor(r: Result): Segment[] {
  return [
    { key: 'net', label: 'Take-home', value: r.net, color: VIZ.net },
    { key: 'it', label: 'Income tax', value: r.incomeTax, color: VIZ.incomeTax },
    { key: 'usc', label: 'USC', value: r.usc, color: VIZ.usc },
    { key: 'prsi', label: 'PRSI', value: r.prsi, color: VIZ.prsi },
    { key: 'pension', label: 'Pension', value: r.pensionContribution + r.autoEnrolment.employee, color: VIZ.pension },
  ];
}

const YEAR_SHAPES: Record<number, ShapeName> = { 2025: 'cookie9', 2026: 'sunny', 2027: 'flower' };

/* ------------------------------------------------------------------ */
/* Hero — the headline number                                          */
/* ------------------------------------------------------------------ */

export function Hero(props: {
  r: Result;
  inputs: Inputs;
  display: Period;
  setDisplay: (p: Period) => void;
}) {
  const { r, inputs, display } = props;
  const s = inputs.schedule;
  const netP = fromAnnual(r.net, display, s);
  const grossP = fromAnnual(r.gross, display, s);
  const anim = useAnimatedNumber(netP);
  const keepPerEuro = r.gross > 0 ? r.net / r.gross : 0;
  const [euros, cents] = eurCents(anim).split('.');

  return (
    <section class="card hero" id="result" aria-live="polite" aria-label="Your take-home pay">
      <div class="hero-shapes" aria-hidden="true">
        <Shape name={YEAR_SHAPES[inputs.year]} class="hero-shape a" />
        <Shape name={inputs.year === 2027 ? 'cookie12' : 'clover'} class="hero-shape b" />
      </div>
      <div class="hero-top">
        <span class="hero-kicker">
          <Icon name="wallet" size={18} /> Your take-home pay · {inputs.year}
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
      <div class="hero-number">
        <span class="hero-euros">{euros}</span>
        <span class="hero-cents">.{cents}</span>
        <span class="hero-per">{PERIOD_LABELS[display].per}</span>
      </div>
      <p class="hero-sub">
        from <b>{eur(grossP, display !== 'year')}</b> gross{inputs.reverse && ' (solved from your take-home)'}. You keep{' '}
        <b>{Math.round(keepPerEuro * 100)}c</b> of every euro.
      </p>
      <div class="hero-chips">
        <span class="stat-chip">
          <span class="stat-chip-label">
            Effective tax rate <Tip>Income tax + USC + PRSI as a share of your total income. Pension contributions are your savings, not tax.</Tip>
          </span>
          <span class="stat-chip-value">{pct(r.effectiveRate)}</span>
        </span>
        <span class="stat-chip">
          <span class="stat-chip-label">
            Marginal rate <Tip>How much of your next euro of salary goes in tax.</Tip>
          </span>
          <span class="stat-chip-value">{pct(r.marginalRate)}</span>
        </span>
        <span class="stat-chip">
          <span class="stat-chip-label">Total tax {PERIOD_LABELS[display].per}</span>
          <span class="stat-chip-value">{eur(fromAnnual(r.totalTax, display, s), display !== 'year')}</span>
        </span>
      </div>
      <SplitBar segments={segmentsFor(r)} total={r.gross} height={28} format={(n) => eur(fromAnnual(n, display, s), display !== 'year')} />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Period table                                                        */
/* ------------------------------------------------------------------ */

export function PeriodTable({ r, inputs }: { r: Result; inputs: Inputs }) {
  const periods: Period[] = ['year', 'month', 'fortnight', 'week', 'day', 'hour'];
  const rows: { label: ComponentChildren; v: number; strong?: boolean; color?: string; neg?: boolean; hide?: boolean }[] = [
    { label: 'Gross pay', v: r.gross, strong: true },
    { label: 'Benefit-in-kind', v: r.bik, hide: r.bik === 0 },
    { label: 'Income tax', v: r.incomeTax, color: VIZ.incomeTax, neg: true },
    { label: 'USC', v: r.usc, color: VIZ.usc, neg: true },
    { label: 'PRSI', v: r.prsi, color: VIZ.prsi, neg: true },
    { label: 'Pension', v: r.pensionContribution, color: VIZ.pension, neg: true, hide: r.pensionContribution === 0 },
    { label: 'Auto-enrolment', v: r.autoEnrolment.employee, color: VIZ.pension, neg: true, hide: r.autoEnrolment.employee === 0 },
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
        Weekly figures assume {inputs.schedule.weeksPerYear} paid weeks, daily {inputs.schedule.daysPerWeek} days a week, hourly{' '}
        {inputs.schedule.hoursPerWeek} hours a week.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Breakdown — show the maths                                          */
/* ------------------------------------------------------------------ */

function Line(props: { label: ComponentChildren; value: ComponentChildren; sub?: boolean; strong?: boolean; neg?: boolean; muted?: boolean }) {
  return (
    <div class={`bline ${props.sub ? 'sub' : ''} ${props.strong ? 'strong' : ''} ${props.muted ? 'muted' : ''}`}>
      <span class="bline-label">{props.label}</span>
      <span class="bline-value">{props.value}</span>
    </div>
  );
}

const range = (a: number, b: number) => (b === Infinity ? `above ${eurWhole(a)}` : `${eurWhole(a)} – ${eurWhole(b)}`);

export function Breakdown({ r }: { r: Result }) {
  const cfg = r.config;
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
        {r.bik > 0 && <Line label="Health insurance (benefit-in-kind)" value={eurCents(r.bik)} />}
        {r.pensionRelieved > 0 && (
          <Line
            label={`Pension contributions relieved (limit ${pct(r.pensionLimitPct, 0)} = ${eurWhole(r.pensionLimit)})`}
            value={`−${eurCents(r.pensionRelieved)}`}
          />
        )}
        {r.pensionContribution > r.pensionRelieved + 0.005 && (
          <Line muted sub label="Above your age limit, so no tax relief" value={eurCents(r.pensionContribution - r.pensionRelieved)} />
        )}
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
          <Line
            sub
            label={
              <>
                {c.label}
                {c.hint && <span class="bline-hint"> · {c.hint}</span>}
              </>
            }
            value={`−${eurCents(c.amount)}`}
          />
        ))}
        {r.creditsTotal > r.grossTax + 0.005 && (
          <Line muted sub label="Unused credits (credits can't create a refund)" value={eurCents(r.creditsTotal - r.grossTax)} />
        )}
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
        {r.uscReduced && <Line sub muted label="Reduced rates (medical card / 70+)" value="✓" />}
        <Line strong label="USC due" value={eurCents(r.usc)} />
      </div>

      <div class="bgroup">
        <h3 class="bgroup-title">
          <span class="legend-swatch" style={{ background: VIZ.prsi }} /> PRSI (Class A)
        </h3>
        {r.prsiExempt ? (
          <Line
            sub
            label={r.prsiLines.length === 0 && r.gross + r.bik > cfg.prsi.weeklyExemption * 52 ? 'Exempt: age 66+' : `Exempt: €${cfg.prsi.weeklyExemption} a week or less`}
            value={eurCents(0)}
          />
        ) : (
          r.prsiLines.map((l) => (
            <Line sub label={`${pct(l.rate, 2)} from ${l.from} (${Math.round(l.share * 12)} months)`} value={eurCents(l.amount)} />
          ))
        )}
        {r.prsiCredit > 0 && <Line sub muted label="PRSI credit (low earnings taper) included" value={`−${eurCents(r.prsiCredit)}`} />}
        <Line strong label="PRSI due" value={eurCents(r.prsi)} />
      </div>

      {(r.pensionContribution > 0 || r.autoEnrolment.employee > 0) && (
        <div class="bgroup">
          <h3 class="bgroup-title">
            <span class="legend-swatch" style={{ background: VIZ.pension }} /> Pension saving
          </h3>
          {r.pensionContribution > 0 && <Line sub label="Your pension contribution" value={eurCents(r.pensionContribution)} />}
          {r.autoEnrolment.employee > 0 && <Line sub label="Auto-enrolment (deducted after tax)" value={eurCents(r.autoEnrolment.employee)} />}
        </div>
      )}

      <div class="bgroup total">
        <Line strong label="Total deductions" value={eurCents(r.totalDeductions)} />
        <Line strong label="Take-home pay" value={eurCents(r.net)} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Sticky take-home bar (phones): visible whenever the hero is off screen */
/* ------------------------------------------------------------------ */

export function StickyResult({ r, inputs, display }: { r: Result; inputs: Inputs; display: Period }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById('result');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const net = fromAnnual(r.net, display, inputs.schedule);
  return (
    <button
      type="button"
      class={`sticky-result ${show ? 'show' : ''}`}
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      onClick={() => document.getElementById('result')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
    >
      <span class="sticky-result-text">
        <span class="sticky-result-label">Take-home</span>
        <span class="sticky-result-value">
          {eur(net, display !== 'year')} <small>{PERIOD_LABELS[display].per}</small>
        </span>
      </span>
      <span class="sticky-result-meta">tax {pct(r.effectiveRate, 0)}</span>
      <Icon name="keyboard_arrow_down" class="sticky-result-arrow" />
    </button>
  );
}
