import { useEffect, useMemo, useState } from 'preact/hooks';
import { employerCost } from '../tax/employer';
import { calculateForSalary, DEFAULT_INPUTS } from '../tax/engine';
import { YEAR_LIST, YEARS, type TaxYear } from '../tax/years';
import { eurCents, eurWhole, pct } from '../lib/format';
import { applyTheme, type SeedId, type ThemeMode } from '../lib/theme';
import { loadPref, savePref } from '../lib/state';
import { ButtonGroup, Icon, IconButton, NumberField, Switch, useAnimatedNumber } from '../components/ui';
import { SplitBar } from '../components/charts';
import { Brand, SiteFooter } from '../components/site';

const isBrowser = typeof window !== 'undefined';

export function EmployerApp() {
  const [year, setYear] = useState<TaxYear>(2026);
  const [gross, setGross] = useState(45000);
  const [pensionPct, setPensionPct] = useState(0);
  const [ae, setAe] = useState(true);
  const [benefits, setBenefits] = useState(0);
  const [mode, setMode] = useState<ThemeMode>(() => (isBrowser ? loadPref<ThemeMode>('mode', 'system') : 'system'));

  useEffect(() => {
    applyTheme(loadPref<SeedId>('seed', 'shamrock'), mode);
    savePref('mode', mode);
  }, [mode]);

  const r = useMemo(() => employerCost({ year, gross, employerPensionPct: pensionPct, autoEnrolment: ae, benefits }), [year, gross, pensionPct, ae, benefits]);
  const emp = useMemo(
    () =>
      calculateForSalary(
        {
          ...DEFAULT_INPUTS,
          year,
          autoEnrolment: ae,
          health: { ...DEFAULT_INPUTS.health, enabled: benefits > 0, premium: benefits },
        },
        gross,
      ),
    [year, gross, ae, benefits],
  );
  const total = useAnimatedNumber(r.total);
  const cfg = YEARS[year];
  const statePerEuro = r.total > 0 ? (emp.totalTax + r.prsi) / r.total : 0;

  const nextMode: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
  const modeIcon = { system: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' } as const;

  return (
    <>
      <header class="topbar">
        <Brand base="../" />
        <ButtonGroup label="Tax year" class="year-group" value={year} onChange={setYear} options={YEAR_LIST.map((y) => ({ value: y, label: String(y) }))} />
        <div class="topbar-actions">
          <IconButton icon={modeIcon[mode]} label="Change theme" onClick={() => setMode(nextMode[mode])} />
        </div>
      </header>
      <main class="layout">
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="../">Home</a> <span>›</span> <span aria-current="page">Employer cost</span>
        </nav>
        <div class="intro">
          <h1>
            What an employee <em>really</em> costs.
          </h1>
          <p>
            Gross pay plus employer PRSI, auto-enrolment matching and pension contributions, for {YEAR_LIST.join(', ')}. See how much of every euro reaches your
            employee.
          </p>
        </div>
        <div class="calc">
          <div class="calc-salary">
            <section class="card salary-card">
              <h2 class="card-title">Employee's gross salary</h2>
              <NumberField size="xl" label="Salary before tax" prefix="€" suffix="per year" value={gross} step={1000} onChange={setGross} />
            </section>
          </div>
          <div class="calc-results">
            <section class="card hero" aria-live="polite">
              <span class="hero-kicker">
                <Icon name="business_center" size={18} /> Total cost to you · {year}
              </span>
              <div class="hero-number">
                <span class="hero-euros">{eurWhole(total)}</span>
                <span class="hero-per">per year</span>
              </div>
              <p class="hero-sub">
                {eurWhole(r.total / 12)} a month, <b>{pct(r.onCost)}</b> on top of salary.
              </p>
              <div class="hero-chips">
                <span class="stat-chip">
                  <span class="stat-chip-label">Employer PRSI</span>
                  <span class="stat-chip-value">{eurWhole(r.prsi)}</span>
                </span>
                <span class="stat-chip">
                  <span class="stat-chip-label">Employee takes home</span>
                  <span class="stat-chip-value">{eurWhole(emp.net)}</span>
                </span>
                <span class="stat-chip">
                  <span class="stat-chip-label">Of each €1 you spend</span>
                  <span class="stat-chip-value">€{(emp.net / Math.max(1, r.total)).toFixed(2)} to them</span>
                </span>
              </div>
              <SplitBar
                total={r.total}
                height={24}
                segments={[
                  { key: 'net', label: 'Employee take-home', value: emp.net, color: 'var(--viz-net)' },
                  { key: 'tax', label: "Employee's tax", value: emp.totalTax, color: 'var(--viz-it)' },
                  { key: 'eprsi', label: 'Employer PRSI', value: r.prsi, color: 'var(--viz-usc)' },
                  { key: 'pen', label: 'Pensions', value: r.autoEnrolment + r.pension + emp.autoEnrolment.employee, color: 'var(--viz-pension)' },
                ]}
              />
              <p class="hero-sub small">About {pct(statePerEuro, 0)} of your total outlay goes to the State as PRSI, USC and Income Tax.</p>
            </section>
            <section class="card">
              <div class="card-head">
                <h2 class="card-title">
                  <Icon name="calculate" /> The breakdown
                </h2>
              </div>
              <div class="bgroup">
                <div class="bline">
                  <span>Gross salary</span>
                  <span>{eurCents(r.gross)}</span>
                </div>
                {r.benefits > 0 && (
                  <div class="bline">
                    <span>Benefits-in-kind</span>
                    <span>{eurCents(r.benefits)}</span>
                  </div>
                )}
                {r.prsiLines.map((l) => (
                  <div class="bline sub">
                    <span>
                      Employer PRSI {pct(l.rate, 2)} from {l.from}
                    </span>
                    <span>{eurCents(l.amount)}</span>
                  </div>
                ))}
                {r.autoEnrolment > 0 && (
                  <div class="bline sub">
                    <span>Auto-enrolment match ({pct(cfg.autoEnrolment.employerRate)})</span>
                    <span>{eurCents(r.autoEnrolment)}</span>
                  </div>
                )}
                {r.pension > 0 && (
                  <div class="bline sub">
                    <span>Employer pension ({pensionPct}%)</span>
                    <span>{eurCents(r.pension)}</span>
                  </div>
                )}
              </div>
              <div class="bgroup total">
                <div class="bline strong">
                  <span>Total employment cost</span>
                  <span>{eurCents(r.total)}</span>
                </div>
              </div>
              <p class="note">
                {r.lowerRateBand
                  ? `Weekly pay of ${eurWhole(r.weekly)} is at or under the ${eurWhole(cfg.employerPrsi.weeklyThreshold)} threshold, so the lower employer rate applies.`
                  : `Weekly pay of ${eurWhole(r.weekly)} is over the ${eurWhole(cfg.employerPrsi.weeklyThreshold)} threshold, so the higher employer rate applies to all of it.`}
              </p>
            </section>
          </div>
          <div class="calc-inputs">
            <section class="card">
              <div class="stack">
                <Switch
                  icon="account_balance"
                  checked={ae && cfg.autoEnrolment.available}
                  disabled={!cfg.autoEnrolment.available}
                  onChange={setAe}
                  label="Auto-enrolment matching"
                  description={cfg.autoEnrolment.available ? `You match ${pct(cfg.autoEnrolment.employerRate)} on pay up to ${eurWhole(cfg.autoEnrolment.earningsCap)}.` : 'Starts 1 January 2026.'}
                />
                <NumberField label="Employer pension contribution" suffix="% of salary" value={pensionPct} step={1} max={40} onChange={setPensionPct} />
                <NumberField label="Taxable benefits (e.g. health insurance)" prefix="€" suffix="per year" value={benefits} step={100} onChange={setBenefits} />
              </div>
            </section>
          </div>
        </div>
        <section class="prose-card card">
          <h2>How employer costs work in Ireland</h2>
          <p>
            Employers pay Class A PRSI on top of salary. In {year} the rate is {pct(cfg.employerPrsi.periods[0].low, 2)} if an employee earns{' '}
            {eurWhole(cfg.employerPrsi.weeklyThreshold)} a week or less, and {pct(cfg.employerPrsi.periods[0].high, 2)} above that, rising to{' '}
            {pct(cfg.employerPrsi.periods[1].high, 2)} from 1 October. The rate applies to all of that week's pay, so a small pay rise across the threshold costs
            more than it looks.
          </p>
          <p>
            From 1 January 2026, employers must also match auto-enrolment (My Future Fund) contributions: 1.5% of pay up to €80,000 for the first three years, rising
            to 6% by year ten.
          </p>
        </section>
      </main>
      <SiteFooter base="../" />
    </>
  );
}
