import type { AmountSetting, Inputs, Period, Result } from '../tax/engine';
import { YEARS, type YearConfig } from '../tax/years';
import { eurWhole, PERIOD_LABELS, pct } from '../lib/format';
import { Button, ButtonGroup, Expander, Icon, IconButton, NumberField, SelectField, Slider, Switch } from './ui';
import { pensionLimitPct } from '../tax/engine';

type Set = (patch: Partial<Inputs>) => void;

const PERIOD_OPTIONS = (['year', 'month', 'fortnight', 'week', 'day', 'hour'] as Period[]).map((p) => ({
  value: p,
  label: PERIOD_LABELS[p].short,
}));
const FREQ_OPTIONS = (['year', 'month', 'fortnight', 'week', 'day'] as Period[]).map((p) => ({
  value: p,
  label: PERIOD_LABELS[p].adj,
}));
const OT_FREQ = (['week', 'fortnight', 'month', 'year', 'day'] as Period[]).map((p) => ({
  value: p,
  label: PERIOD_LABELS[p].per,
}));
const TYPE_OPTIONS = [
  { value: 'percent' as const, label: '% of salary', icon: 'percent' as const },
  { value: 'fixed' as const, label: 'Fixed amount', icon: 'euro' as const },
];

export function SalaryCard({ inputs, set }: { inputs: Inputs; set: Set }) {
  return (
    <section class="card salary-card" aria-labelledby="salary-h">
      <h2 id="salary-h" class="card-title">
        {inputs.reverse ? 'Your take-home pay' : 'Your gross salary'}
      </h2>
      <NumberField
        size="xl"
        label={inputs.reverse ? 'Take-home amount' : 'Salary before tax'}
        prefix="€"
        value={inputs.amount}
        step={inputs.period === 'year' ? 1000 : inputs.period === 'hour' ? 0.5 : 50}
        onChange={(amount) => set({ amount })}
        suffix={PERIOD_LABELS[inputs.period].per}
      />
      <ButtonGroup label="Pay period" size="sm" class="period-group" options={PERIOD_OPTIONS} value={inputs.period} onChange={(period) => set({ period })} />
      <Switch
        icon="swap_horiz"
        checked={inputs.reverse}
        onChange={(reverse) => set({ reverse })}
        label="Work backwards from take-home"
        description="Know what lands in your account? We'll find the gross salary."
      />
    </section>
  );
}

/** % of salary or a fixed amount, with an optional "paid" frequency. */
function AmountInput(props: { label: string; value: AmountSetting; onChange: (v: AmountSetting) => void; maxPct?: number }) {
  const v = props.value;
  return (
    <>
      <ButtonGroup label={`${props.label} type`} size="sm" stretch value={v.type} onChange={(type) => props.onChange({ ...v, type })} options={TYPE_OPTIONS} />
      <div class="row">
        <NumberField
          label={props.label}
          prefix={v.type === 'fixed' ? '€' : undefined}
          suffix={v.type === 'percent' ? '%' : undefined}
          value={v.value}
          step={v.type === 'percent' ? 1 : 50}
          max={v.type === 'percent' ? (props.maxPct ?? 100) : undefined}
          onChange={(value) => props.onChange({ ...v, value })}
        />
        {v.type === 'fixed' && <SelectField label="Paid" value={v.per} options={FREQ_OPTIONS} onChange={(per) => props.onChange({ ...v, per })} />}
      </div>
    </>
  );
}

export function OptionsPanel({ inputs, set, r }: { inputs: Inputs; set: Set; r: Result }) {
  const cfg = YEARS[inputs.year];
  const overLimit = Math.max(0, r.pensionRequested - r.pensionLimit);
  const capped = !!inputs.pension.capToRelief && overLimit > 0.5;
  const married = inputs.family === 'marriedOne' || inputs.family === 'marriedTwo';
  const twoIncome = inputs.family === 'marriedTwo';
  const sp = inputs.spouse;
  const setSpouse = (patch: Partial<Inputs['spouse']>) => set({ spouse: { ...sp, ...patch } });

  const householdCount =
    (inputs.family !== 'single' ? 1 : 0) +
    (inputs.medicalCard ? 1 : 0) +
    (inputs.incapacitatedChild ? 1 : 0) +
    (inputs.age >= 65 ? 1 : 0) +
    (inputs.blind.you ? 1 : 0) +
    (inputs.dependentRelatives > 0 ? 1 : 0);
  const pensionCount = (inputs.pension.value > 0 ? 1 : 0) + (inputs.avc.value > 0 ? 1 : 0) + (inputs.autoEnrolment && cfg.autoEnrolment.available ? 1 : 0);
  const extraCount = (inputs.bonus.value > 0 ? 1 : 0) + inputs.overtime.length;
  const shares = inputs.shares;
  const sharesCount = (shares.espp.value > 0 ? 1 : 0) + (shares.apss > 0 ? 1 : 0) + (shares.rsu > 0 ? 1 : 0);
  const bikCount = (inputs.health.enabled ? 1 : 0) + (inputs.car.enabled ? 1 : 0) + (inputs.loan.enabled ? 1 : 0) + (inputs.otherBik > 0 ? 1 : 0);
  const creditCount =
    (inputs.rent.enabled ? 1 : 0) +
    (inputs.mortgage.enabled && cfg.credits.mortgageInterestCap !== null ? 1 : 0) +
    (inputs.flatRateExpenses > 0 ? 1 : 0) +
    (inputs.remote.enabled ? 1 : 0) +
    (inputs.otherCredits > 0 ? 1 : 0);
  const oi = inputs.otherIncome;
  const otherCount = Object.values(oi).filter((v) => v > 0).length;
  const s = inputs.schedule;
  const scheduleChanged = s.weeksPerYear !== 52 || s.daysPerWeek !== 5 || s.hoursPerWeek !== 39;
  const limitPct = pensionLimitPct(inputs.age, cfg);
  const pensionSummary =
    inputs.pension.value > 0 || inputs.avc.value > 0
      ? `${eurWhole(r.pensionContribution)} a year${capped ? ', capped at relief limit' : overLimit > 0.5 ? `, ${eurWhole(overLimit)} over relief limit` : ''}`
      : 'No contributions';

  return (
    <div class="options">
      <Expander icon="family_restroom" title="You & your household" summary={`${familyLabel(inputs.family)} · age ${inputs.age}`} badge={householdCount} defaultOpen>
        <div class="stack">
          <SelectField
            label="Tax status"
            value={inputs.family}
            onChange={(family) => set({ family })}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'singleParent', label: 'Single parent / guardian' },
              { value: 'marriedOne', label: 'Married / civil partners, one income' },
              { value: 'marriedTwo', label: 'Married / civil partners, two incomes' },
              { value: 'widowed', label: 'Widowed, no dependent children' },
            ]}
            hint={bandHint(inputs, cfg)}
          />
          {twoIncome && (
            <div class="sub-section">
              <h3 class="sub-title">
                <Icon name="person_add" size={18} /> Your spouse or partner
              </h3>
              <div class="row">
                <NumberField label="Their salary" prefix="€" suffix="per year" value={sp.salary} step={1000} onChange={(salary) => setSpouse({ salary })} />
                <NumberField label="Their bonus" prefix="€" suffix="per year" value={sp.bonus} step={500} onChange={(bonus) => setSpouse({ bonus })} />
              </div>
              <AmountInput label="Their pension" value={sp.pension} onChange={(pension) => setSpouse({ pension })} />
              <div class="row">
                <NumberField label="Their AVCs" prefix="€" suffix="per year" value={sp.avc} step={100} onChange={(avc) => setSpouse({ avc })} />
                <NumberField label="Their benefits-in-kind" prefix="€" suffix="per year" value={sp.bik} step={100} onChange={(bik) => setSpouse({ bik })} />
              </div>
              <NumberField label="Their age" suffix="years" value={sp.age} min={16} max={110} onChange={(age) => setSpouse({ age: Math.round(age) || 0 })} />
              {cfg.autoEnrolment.available && (
                <Switch icon="account_balance" checked={sp.autoEnrolment} onChange={(autoEnrolment) => setSpouse({ autoEnrolment })} label="They're in auto-enrolment" />
              )}
              <Switch icon="medical_services" checked={sp.medicalCard} onChange={(medicalCard) => setSpouse({ medicalCard })} label="They have a full medical card" />
              <p class="note">You're jointly assessed: you share the 20% band and personal credits, while USC and PRSI are worked out for each of you.</p>
            </div>
          )}
          {inputs.family === 'marriedOne' && (
            <Switch
              icon="volunteer_activism"
              checked={inputs.homeCarer}
              onChange={(homeCarer) => set({ homeCarer })}
              label="Spouse is a home carer"
              description={`Cares for a child, a person 65+ or someone with a disability at home: ${eurWhole(cfg.credits.homeCarer)} credit.`}
            />
          )}
          <NumberField
            label="Your age"
            suffix="years"
            value={inputs.age}
            min={16}
            max={110}
            onChange={(age) => set({ age: Math.round(age) || 0 })}
            hint="Sets your pension relief limit, Age credit (65+), PRSI exemption (66+) and reduced USC (70+)."
          />
          <Switch
            icon="medical_services"
            checked={inputs.medicalCard}
            onChange={(medicalCard) => set({ medicalCard })}
            label="Full medical card"
            description={`Reduced USC (max 2%) if income is ${eurWhole(cfg.usc.reducedIncomeLimit)} or less.`}
          />
          <Switch
            icon="visibility_off"
            checked={inputs.blind.you}
            onChange={(you) => set({ blind: { ...inputs.blind, you } })}
            label="Blind or severely visually impaired"
            description={`Blind Person credit: ${eurWhole(cfg.extra.blindSingle)}.`}
          />
          {married && (
            <Switch
              icon="visibility_off"
              checked={inputs.blind.spouse}
              onChange={(spouse) => set({ blind: { ...inputs.blind, spouse } })}
              label="Spouse is blind or severely visually impaired"
              description={`${eurWhole(cfg.extra.blindBoth)} if you both are.`}
            />
          )}
          <NumberField
            label="Dependent relatives you support"
            value={inputs.dependentRelatives}
            step={1}
            max={10}
            onChange={(n) => set({ dependentRelatives: Math.round(n) })}
            hint={`${eurWhole(cfg.extra.dependentRelative)} credit each, e.g. a parent on a low income.`}
          />
          <Switch
            icon="child_care"
            checked={inputs.incapacitatedChild}
            onChange={(incapacitatedChild) => set({ incapacitatedChild })}
            label="Incapacitated child"
            description={`${eurWhole(cfg.credits.incapacitatedChild)} credit for a child permanently incapacitated.`}
          />
        </div>
      </Expander>

      <Expander icon="savings" title="Pension" summary={pensionSummary} badge={pensionCount}>
        <div class="stack">
          <AmountInput label="Your contribution" value={inputs.pension} onChange={(v) => set({ pension: { ...inputs.pension, ...v } })} />
          <h3 class="sub-title">Additional Voluntary Contributions (AVCs)</h3>
          <AmountInput label="AVCs" value={inputs.avc} onChange={(avc) => set({ avc })} />
          <p class="note">
            Your pension and AVCs share one tax relief limit: <b>{pct(limitPct, 0)}</b> of earnings at your age, on earnings up to{' '}
            {eurWhole(cfg.pension.earningsCap)}. Relief is at your marginal rate and doesn't reduce USC or PRSI.
          </p>
          {overLimit > 0.5 && (
            <div class="pension-alert" role="note">
              <Icon name="info" size={20} />
              {capped ? (
                <span>
                  Your contributions are capped at <b>{eurWhole(r.pensionLimit)}</b> a year, the most that gets tax relief at your age.
                </span>
              ) : (
                <span>
                  Tax relief covers <b>{eurWhole(r.pensionLimit)}</b> of your <b>{eurWhole(r.pensionRequested)}</b> a year. The other <b>{eurWhole(overLimit)}</b>{' '}
                  still comes out of your pay but gets no tax relief.
                </span>
              )}
            </div>
          )}
          {overLimit > 0.5 && (
            <Switch
              icon="savings"
              checked={!!inputs.pension.capToRelief}
              onChange={(capToRelief) => set({ pension: { ...inputs.pension, capToRelief } })}
              label="Cap my contributions at the tax relief limit"
              description={`Only pay in what gets tax relief: ${eurWhole(r.pensionLimit)} a year.`}
            />
          )}
          <Switch
            icon="account_balance"
            checked={inputs.autoEnrolment && cfg.autoEnrolment.available}
            disabled={!cfg.autoEnrolment.available}
            onChange={(autoEnrolment) => set({ autoEnrolment })}
            label="Auto-enrolment (My Future Fund)"
            description={
              cfg.autoEnrolment.available
                ? `You pay ${pct(cfg.autoEnrolment.employeeRate)}, your employer matches ${pct(cfg.autoEnrolment.employerRate)}, and the State adds ${pct(cfg.autoEnrolment.stateRate)} (on pay up to ${eurWhole(cfg.autoEnrolment.earningsCap)}).`
                : 'Starts 1 January 2026. Switch the tax year to 2026 or 2027.'
            }
          />
          {inputs.publicSector.enabled && <p class="note">Public sector? Enter your superannuation contribution here. Your ASC is worked out under Public sector.</p>}
        </div>
      </Expander>

      <Expander
        icon="payments"
        title="Bonus & overtime"
        summary={
          extraCount
            ? `${inputs.bonus.value > 0 ? `Bonus ${eurWhole(r.bonus)}` : ''}${inputs.bonus.value > 0 && inputs.overtime.length ? ' + ' : ''}${inputs.overtime.length ? `${inputs.overtime.length} overtime rate${inputs.overtime.length > 1 ? 's' : ''}` : ''}`
            : 'None'
        }
        badge={extraCount}
      >
        <div class="stack">
          <h3 class="sub-title">Bonus or commission</h3>
          <AmountInput label="Bonus" value={inputs.bonus} onChange={(bonus) => set({ bonus })} maxPct={500} />
          {r.bonus > 0 && (
            <div class="sub-section">
              <Slider
                label="Paid into your pension"
                value={inputs.bonusPlan.toPensionPct}
                min={0}
                max={100}
                step={5}
                format={(n) => `${n}% · ${eurWhole((r.bonus * n) / 100)}`}
                onChange={(toPensionPct) => set({ bonusPlan: { ...inputs.bonusPlan, toPensionPct } })}
                hint="Paid in as an AVC, so it gets income tax relief within your pension limit. See what you'd pocket under Insights."
              />
              <Switch
                icon="calendar_month"
                checked={inputs.bonusPlan.separate}
                onChange={(separate) => set({ bonusPlan: { ...inputs.bonusPlan, separate } })}
                label="Keep the bonus out of my regular pay"
                description="Shows your normal take-home, with the bonus as a separate lump sum."
              />
            </div>
          )}
          <h3 class="sub-title">Overtime</h3>
          {inputs.overtime.map((o, i) => (
            <div class="ot-row">
              <NumberField label="Hours" value={o.hours} step={1} onChange={(hours) => set({ overtime: inputs.overtime.map((x, j) => (j === i ? { ...x, hours } : x)) })} />
              <SelectField label="Every" value={o.per} options={OT_FREQ} onChange={(per) => set({ overtime: inputs.overtime.map((x, j) => (j === i ? { ...x, per } : x)) })} />
              <NumberField
                label="Rate"
                suffix="×"
                value={o.multiplier}
                step={0.25}
                onChange={(multiplier) => set({ overtime: inputs.overtime.map((x, j) => (j === i ? { ...x, multiplier } : x)) })}
              />
              <IconButton icon="close" label="Remove overtime rate" onClick={() => set({ overtime: inputs.overtime.filter((_, j) => j !== i) })} />
            </div>
          ))}
          {inputs.overtime.length < 3 && (
            <Button
              variant="tonal"
              size="sm"
              icon="add"
              onClick={() => set({ overtime: [...inputs.overtime, { hours: 5, per: 'week', multiplier: inputs.overtime.length ? 2 : 1.5 }] })}
            >
              Add {inputs.overtime.length ? 'another' : 'an'} overtime rate
            </Button>
          )}
          <p class="note">Overtime is paid on your hourly rate, worked out from your salary and work schedule.</p>
        </div>
      </Expander>

      <Expander icon="show_chart" title="Company shares" summary={sharesCount ? `${sharesCount} plan${sharesCount > 1 ? 's' : ''}` : 'ESPP, profit sharing (APSS), RSUs'} badge={sharesCount}>
        <div class="stack">
          <h3 class="sub-title">Employee share purchase plan (ESPP)</h3>
          <AmountInput label="ESPP contribution" value={shares.espp} onChange={(v) => set({ shares: { ...shares, espp: { ...shares.espp, ...v } } })} maxPct={50} />
          <NumberField
            label="Purchase discount"
            suffix="%"
            value={shares.espp.discount}
            step={1}
            max={50}
            onChange={(discount) => set({ shares: { ...shares, espp: { ...shares.espp, discount } } })}
            hint="Usually 15%. Contributions come out of your pay after tax; the discount is taxed as pay through payroll."
          />
          <h3 class="sub-title">Bonus taken as shares (APSS)</h3>
          <NumberField
            label="Value of shares received"
            prefix="€"
            suffix="per year"
            value={shares.apss}
            step={500}
            onChange={(apss) => set({ shares: { ...shares, apss } })}
            hint={`No Income Tax up to ${eurWhole(cfg.extra.apssLimit)} a year if you hold the shares for three years. USC and PRSI still apply.`}
          />
          <h3 class="sub-title">Restricted stock units (RSUs)</h3>
          <NumberField
            label="Value vesting"
            prefix="€"
            suffix="per year"
            value={shares.rsu}
            step={1000}
            onChange={(rsu) => set({ shares: { ...shares, rsu } })}
            hint="Taxed as pay when they vest, at your marginal rates."
          />
          {shares.rsu > 0 && (
            <Switch
              icon="compare_arrows"
              checked={shares.rsuSellToCover}
              onChange={(rsuSellToCover) => set({ shares: { ...shares, rsuSellToCover } })}
              label="Sell to cover"
              description="Some shares are sold to pay the tax, so it doesn't come out of your salary."
            />
          )}
          <p class="note">Enter share values in euro. Nothing is looked up online, so your details stay on your device.</p>
        </div>
      </Expander>

      <Expander icon="directions_car" title="Benefits-in-kind" summary={bikCount ? `${eurWhole(r.bik)} a year taxable` : 'Health insurance, company car, loans'} badge={bikCount}>
        <div class="stack">
          <Switch
            icon="medical_services"
            checked={inputs.health.enabled}
            onChange={(enabled) => set({ health: { ...inputs.health, enabled } })}
            label="Employer-paid health insurance"
            description="Taxed as a benefit-in-kind, with 20% tax relief on the premium."
          />
          {inputs.health.enabled && (
            <>
              <div class="row">
                <NumberField label="Gross premium" prefix="€" value={inputs.health.premium} step={50} onChange={(premium) => set({ health: { ...inputs.health, premium } })} />
                <SelectField
                  label="Per"
                  value={inputs.health.per}
                  options={[
                    { value: 'year', label: 'Year' },
                    { value: 'month', label: 'Month' },
                  ]}
                  onChange={(per) => set({ health: { ...inputs.health, per } })}
                />
              </div>
              <div class="row">
                <SelectField
                  label="Adults covered"
                  value={inputs.health.adults}
                  options={[0, 1, 2].map((n) => ({ value: n, label: String(n) }))}
                  onChange={(adults) => set({ health: { ...inputs.health, adults } })}
                />
                <SelectField
                  label="Children covered"
                  value={inputs.health.children}
                  options={[0, 1, 2, 3, 4, 5].map((n) => ({ value: n, label: String(n) }))}
                  onChange={(children) => set({ health: { ...inputs.health, children } })}
                />
              </div>
              <p class="note">Enter the combined premium for everyone on the policy.</p>
            </>
          )}
          <Switch
            icon="directions_car"
            checked={inputs.car.enabled}
            onChange={(enabled) => set({ car: { ...inputs.car, enabled } })}
            label="Company car"
            description="Taxed on a % of its original market value, based on emissions and business kilometres."
          />
          {inputs.car.enabled && (
            <>
              <div class="row">
                <NumberField label="Original market value" prefix="€" value={inputs.car.omv} step={1000} onChange={(omv) => set({ car: { ...inputs.car, omv } })} />
                <SelectField
                  label="CO₂ category"
                  value={inputs.car.category}
                  onChange={(category) => set({ car: { ...inputs.car, category } })}
                  options={[
                    { value: 'A1', label: 'A1: electric, 0 g/km' },
                    { value: 'A', label: 'A: 1 to 59 g/km' },
                    { value: 'B', label: 'B: 60 to 99 g/km' },
                    { value: 'C', label: 'C: 100 to 139 g/km' },
                    { value: 'D', label: 'D: 140 to 179 g/km' },
                    { value: 'E', label: 'E: 180+ g/km' },
                  ]}
                />
              </div>
              <div class="row">
                <NumberField
                  label="Business kilometres"
                  suffix="per year"
                  value={inputs.car.businessKm}
                  step={1000}
                  onChange={(businessKm) => set({ car: { ...inputs.car, businessKm } })}
                />
                <NumberField
                  label="You pay towards it"
                  prefix="€"
                  suffix="per year"
                  value={inputs.car.contribution}
                  step={100}
                  onChange={(contribution) => set({ car: { ...inputs.car, contribution } })}
                />
              </div>
              <p class="note">
                {cfg.year}: {eurWhole(cfg.extra.car.universalReduction)} off the value for categories {cfg.extra.car.hasA1 ? 'A1' : 'A'} to D
                {cfg.extra.car.evReduction ? `, plus ${eurWhole(cfg.extra.car.evReduction)} more for electric cars` : ''}.
              </p>
            </>
          )}
          <Switch
            icon="account_balance"
            checked={inputs.loan.enabled}
            onChange={(enabled) => set({ loan: { ...inputs.loan, enabled } })}
            label="Cheap loan from your employer"
            description={`Taxed on the interest you save compared to ${pct(cfg.extra.loanRates.home)} (home loans) or ${pct(cfg.extra.loanRates.other)} (other loans).`}
          />
          {inputs.loan.enabled && (
            <>
              <div class="row">
                <NumberField label="Average balance" prefix="€" value={inputs.loan.amount} step={1000} onChange={(amount) => set({ loan: { ...inputs.loan, amount } })} />
                <NumberField label="Interest rate you pay" suffix="%" value={inputs.loan.rate} step={0.25} max={30} onChange={(rate) => set({ loan: { ...inputs.loan, rate } })} />
              </div>
              <ButtonGroup
                label="Loan type"
                size="sm"
                stretch
                value={inputs.loan.kind}
                onChange={(kind) => set({ loan: { ...inputs.loan, kind } })}
                options={[
                  { value: 'home', label: 'Home loan' },
                  { value: 'other', label: 'Other loan' },
                ]}
              />
            </>
          )}
          <NumberField
            label="Other taxable benefits"
            prefix="€"
            suffix="per year"
            value={inputs.otherBik}
            step={100}
            onChange={(otherBik) => set({ otherBik })}
            hint="Club or gym subscriptions, accommodation and other perks your employer pays for."
          />
        </div>
      </Expander>

      <Expander icon="receipt_long" title="Tax credits & reliefs" summary={creditCount ? `${creditCount} active` : 'Rent, flat rate expenses, remote working'} badge={creditCount}>
        <div class="stack">
          <Switch
            icon="apartment"
            checked={inputs.rent.enabled}
            onChange={(enabled) => set({ rent: { ...inputs.rent, enabled } })}
            label="Rent Tax Credit"
            description={`20% of rent paid, up to ${eurWhole(married ? cfg.credits.rentCouple : cfg.credits.rentSingle)} a year in ${cfg.year}.`}
          />
          {inputs.rent.enabled && (
            <NumberField label="Rent you pay" prefix="€" suffix="per month" value={inputs.rent.monthly} step={50} onChange={(monthly) => set({ rent: { ...inputs.rent, monthly } })} />
          )}
          <Switch
            icon="home"
            checked={inputs.mortgage.enabled && cfg.credits.mortgageInterestCap !== null}
            disabled={cfg.credits.mortgageInterestCap === null}
            onChange={(enabled) => set({ mortgage: { ...inputs.mortgage, enabled } })}
            label="Mortgage Interest Tax Credit"
            description={
              cfg.credits.mortgageInterestCap === null
                ? `Not available in ${cfg.year}. The relief ended after 2026.`
                : `20% of the increase in interest paid vs 2022, up to ${eurWhole(cfg.credits.mortgageInterestCap)}.`
            }
          />
          {inputs.mortgage.enabled && cfg.credits.mortgageInterestCap !== null && (
            <div class="row">
              <NumberField
                label={`Interest paid in ${cfg.year}`}
                prefix="€"
                value={inputs.mortgage.interest}
                step={100}
                onChange={(interest) => set({ mortgage: { ...inputs.mortgage, interest } })}
              />
              <NumberField
                label="Interest paid in 2022"
                prefix="€"
                value={inputs.mortgage.interest2022}
                step={100}
                onChange={(interest2022) => set({ mortgage: { ...inputs.mortgage, interest2022 } })}
              />
            </div>
          )}
          <NumberField
            label="Flat rate expenses"
            prefix="€"
            suffix="per year"
            value={inputs.flatRateExpenses}
            step={50}
            onChange={(flatRateExpenses) => set({ flatRateExpenses })}
            hint={
              <>
                A set amount for your job, e.g. nurses, teachers, retail and construction workers. Find yours in{' '}
                <a href="https://www.revenue.ie/en/jobs-and-pensions/flat-rate-expenses/index.aspx" target="_blank" rel="noopener">
                  Revenue's list
                </a>
                .
              </>
            }
          />
          <Switch
            icon="computer"
            checked={inputs.remote.enabled}
            onChange={(enabled) => set({ remote: { ...inputs.remote, enabled } })}
            label="Remote working relief"
            description="30% of your electricity, heating and broadband for the days you work from home."
          />
          {inputs.remote.enabled && (
            <>
              <div class="row">
                <NumberField
                  label="Yearly bills"
                  prefix="€"
                  value={inputs.remote.bills}
                  step={100}
                  onChange={(bills) => set({ remote: { ...inputs.remote, bills } })}
                  hint="Electricity, heating and broadband"
                />
                <NumberField label="Days worked at home" suffix="per year" value={inputs.remote.days} step={5} max={366} onChange={(days) => set({ remote: { ...inputs.remote, days } })} />
              </div>
              <NumberField
                label="Remote working allowance from your employer"
                prefix="€"
                suffix="per year"
                value={inputs.remote.allowance}
                step={50}
                onChange={(allowance) => set({ remote: { ...inputs.remote, allowance } })}
              />
            </>
          )}
          <NumberField
            label="Other tax credits"
            prefix="€"
            suffix="per year"
            value={inputs.otherCredits}
            step={50}
            onChange={(otherCredits) => set({ otherCredits })}
            hint="Anything else on your Revenue Tax Credit Certificate, e.g. tuition fees or medical expenses."
          />
        </div>
      </Expander>

      <Expander icon="wallet" title="Other income" summary={otherCount ? `${eurWhole(r.otherIncomeTotal)} a year` : 'Self-employed, rental, investments, State pension'} badge={otherCount}>
        <div class="stack">
          <NumberField
            label="Self-employed profit"
            prefix="€"
            suffix="per year"
            value={oi.selfEmployed}
            step={1000}
            onChange={(selfEmployed) => set({ otherIncome: { ...oi, selfEmployed } })}
            hint="Class S PRSI (at least €650 a year), the Earned Income credit, and a 3% USC surcharge on non-PAYE income over €100,000."
          />
          <NumberField
            label="Rental profit"
            prefix="€"
            suffix="per year"
            value={oi.rental}
            step={500}
            onChange={(rental) => set({ otherIncome: { ...oi, rental } })}
            hint="Rent received minus allowable expenses."
          />
          <NumberField
            label="Rent-a-room income"
            prefix="€"
            suffix="per year"
            value={oi.rentARoom}
            step={500}
            onChange={(rentARoom) => set({ otherIncome: { ...oi, rentARoom } })}
            hint={`Tax-free up to ${eurWhole(cfg.extra.rentARoomLimit)} in ${cfg.year}. Go over and all of it is taxable.`}
          />
          <NumberField
            label="Investment income"
            prefix="€"
            suffix="per year"
            value={oi.investment}
            step={500}
            onChange={(investment) => set({ otherIncome: { ...oi, investment } })}
            hint="Dividends and similar income, taxed at your marginal rate. Deposit interest (DIRT) and fund exit tax are taxed separately and aren't included."
          />
          <NumberField
            label="State pension"
            prefix="€"
            suffix="per year"
            value={oi.statePension}
            step={500}
            onChange={(statePension) => set({ otherIncome: { ...oi, statePension } })}
            hint="Taxable, but no USC or PRSI."
          />
        </div>
      </Expander>

      <Expander icon="badge" title="Public sector" summary={inputs.publicSector.enabled ? `ASC ${eurWhole(r.asc)} a year` : 'Off'} badge={inputs.publicSector.enabled ? 1 : 0}>
        <div class="stack">
          <Switch
            icon="badge"
            checked={inputs.publicSector.enabled}
            onChange={(enabled) => set({ publicSector: { ...inputs.publicSector, enabled } })}
            label="I work in the public sector"
            description="Adds the Additional Superannuation Contribution (ASC), which gets income tax relief."
          />
          {inputs.publicSector.enabled && (
            <>
              <SelectField
                label="Pension scheme"
                value={inputs.publicSector.scheme}
                onChange={(scheme) => set({ publicSector: { ...inputs.publicSector, scheme } })}
                options={[
                  { value: 'standard', label: 'Pre-2013 scheme' },
                  { value: 'fast', label: 'Pre-2013 scheme, fast accrual' },
                  { value: 'single', label: 'Single Public Service Pension Scheme' },
                ]}
                hint={
                  inputs.publicSector.scheme === 'single'
                    ? `ASC: 3.33% from ${eurWhole(cfg.extra.asc.exempt)} to ${eurWhole(cfg.extra.asc.band2)}, 3.5% above.`
                    : `ASC: nothing up to ${eurWhole(inputs.publicSector.scheme === 'fast' ? cfg.extra.asc.fastExempt : cfg.extra.asc.exempt)}, 10% to ${eurWhole(cfg.extra.asc.band2)}, 10.5% above.`
                }
              />
              <Switch
                icon="work_history"
                checked={inputs.publicSector.classD}
                onChange={(classD) => set({ publicSector: { ...inputs.publicSector, classD } })}
                label="Joined before 6 April 1995 (PRSI Class D)"
                description="A lower PRSI rate on the first €1,443 a week."
              />
              <p class="note">Put your main superannuation contribution in the Pension section.</p>
            </>
          )}
        </div>
      </Expander>

      <Expander icon="schedule" title="Work schedule" summary={`${s.hoursPerWeek} hrs/week · ${s.daysPerWeek} days · ${s.weeksPerYear} weeks`} badge={scheduleChanged ? 1 : 0}>
        <div class="stack">
          <div class="row three">
            <NumberField label="Hours / week" value={s.hoursPerWeek} step={0.5} max={168} onChange={(hoursPerWeek) => set({ schedule: { ...s, hoursPerWeek } })} />
            <NumberField label="Days / week" value={s.daysPerWeek} step={0.5} max={7} onChange={(daysPerWeek) => set({ schedule: { ...s, daysPerWeek } })} />
            <NumberField label="Weeks / year" value={s.weeksPerYear} step={1} max={53} onChange={(weeksPerYear) => set({ schedule: { ...s, weeksPerYear } })} />
          </div>
          <p class="note">Used to convert between hourly, daily and weekly pay, and to price overtime.</p>
        </div>
      </Expander>
    </div>
  );
}

function familyLabel(f: Inputs['family']) {
  return {
    single: 'Single',
    singleParent: 'Single parent',
    marriedOne: 'Married, one income',
    marriedTwo: 'Married, two incomes',
    widowed: 'Widowed',
  }[f];
}

function bandHint(inputs: Inputs, cfg: YearConfig) {
  const b = cfg.incomeTax.bands;
  switch (inputs.family) {
    case 'single':
      return `20% on the first ${eurWhole(b.single)}, 40% above.`;
    case 'singleParent':
      return `20% on the first ${eurWhole(b.singleParent)}, plus the Single Person Child Carer credit.`;
    case 'marriedOne':
      return `20% on the first ${eurWhole(b.marriedOneIncome)} and a doubled personal credit.`;
    case 'marriedTwo':
      return `Up to ${eurWhole(b.marriedOneIncome + b.marriedSecondIncomeIncrease)} at 20% across both of you.`;
    case 'widowed':
      return `20% on the first ${eurWhole(b.single)}, with the ${eurWhole(cfg.extra.widowed)} Widowed person credit. With dependent children, choose Single parent.`;
  }
}
