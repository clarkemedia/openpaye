import type { Inputs, Period } from '../tax/engine';
import { YEARS } from '../tax/years';
import { eurWhole, PERIOD_LABELS, pct } from '../lib/format';
import { Button, ButtonGroup, Expander, IconButton, NumberField, SelectField, Switch } from './ui';
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
      <ButtonGroup
        label="Pay period"
        size="sm"
        class="period-group"
        options={PERIOD_OPTIONS}
        value={inputs.period}
        onChange={(period) => set({ period })}
      />
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

export function OptionsPanel({ inputs, set }: { inputs: Inputs; set: Set }) {
  const cfg = YEARS[inputs.year];
  const married = inputs.family === 'marriedOne' || inputs.family === 'marriedTwo';

  const householdCount =
    (inputs.family !== 'single' ? 1 : 0) + (inputs.medicalCard ? 1 : 0) + (inputs.incapacitatedChild ? 1 : 0) + (inputs.age >= 65 ? 1 : 0);
  const pensionCount = (inputs.pension.value > 0 ? 1 : 0) + (inputs.autoEnrolment && cfg.autoEnrolment.available ? 1 : 0);
  const extraCount = (inputs.bonus.value > 0 ? 1 : 0) + inputs.overtime.length;
  const creditCount =
    (inputs.rent.enabled ? 1 : 0) +
    (inputs.mortgage.enabled && cfg.credits.mortgageInterestCap !== null ? 1 : 0) +
    (inputs.health.enabled ? 1 : 0) +
    (inputs.otherCredits > 0 ? 1 : 0);
  const s = inputs.schedule;
  const scheduleChanged = s.weeksPerYear !== 52 || s.daysPerWeek !== 5 || s.hoursPerWeek !== 39;

  const limitPct = pensionLimitPct(inputs.age, cfg);

  return (
    <div class="options">
      <Expander
        icon="family_restroom"
        title="You & your household"
        summary={`${familyLabel(inputs.family)} · age ${inputs.age}`}
        badge={householdCount}
        defaultOpen
      >
        <div class="stack">
          <SelectField
            label="Tax status"
            value={inputs.family}
            onChange={(family) => set({ family })}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'singleParent', label: 'Single parent / guardian' },
              { value: 'marriedOne', label: 'Married / civil partners — one income' },
              { value: 'marriedTwo', label: 'Married / civil partners — two incomes' },
            ]}
            hint={bandHint(inputs, cfg)}
          />
          {inputs.family === 'marriedTwo' && (
            <NumberField
              label="Spouse's / partner's gross income"
              prefix="€"
              suffix="per year"
              value={inputs.spouseIncome}
              step={1000}
              onChange={(spouseIncome) => set({ spouseIncome })}
              hint="Jointly assessed. Your spouse's tax is shown in the household card."
            />
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
            icon="child_care"
            checked={inputs.incapacitatedChild}
            onChange={(incapacitatedChild) => set({ incapacitatedChild })}
            label="Incapacitated child"
            description={`${eurWhole(cfg.credits.incapacitatedChild)} credit for a child permanently incapacitated.`}
          />
        </div>
      </Expander>

      <Expander
        icon="savings"
        title="Pension"
        summary={
          inputs.pension.value > 0
            ? inputs.pension.type === 'percent'
              ? `${inputs.pension.value}% of salary`
              : `${eurWhole(inputs.pension.value)} ${PERIOD_LABELS[inputs.pension.per].per}`
            : 'No contributions'
        }
        badge={pensionCount}
      >
        <div class="stack">
          <ButtonGroup
            label="Contribution type"
            size="sm"
            stretch
            value={inputs.pension.type}
            onChange={(type) => set({ pension: { ...inputs.pension, type } })}
            options={[
              { value: 'percent', label: '% of salary', icon: 'percent' },
              { value: 'fixed', label: 'Fixed amount', icon: 'euro' },
            ]}
          />
          <div class="row">
            <NumberField
              label="Your contribution"
              prefix={inputs.pension.type === 'fixed' ? '€' : undefined}
              suffix={inputs.pension.type === 'percent' ? '%' : undefined}
              value={inputs.pension.value}
              step={inputs.pension.type === 'percent' ? 1 : 50}
              max={inputs.pension.type === 'percent' ? 100 : undefined}
              onChange={(value) => set({ pension: { ...inputs.pension, value } })}
            />
            {inputs.pension.type === 'fixed' && (
              <SelectField
                label="Paid"
                value={inputs.pension.per}
                options={FREQ_OPTIONS}
                onChange={(per) => set({ pension: { ...inputs.pension, per } })}
              />
            )}
          </div>
          <p class="note">
            Tax relief at your marginal rate on up to <b>{pct(limitPct, 0)}</b> of earnings (age-based limit), on earnings
            up to {eurWhole(cfg.pension.earningsCap)}. Pension contributions don't reduce USC or PRSI.
          </p>
          <Switch
            icon="account_balance"
            checked={inputs.autoEnrolment && cfg.autoEnrolment.available}
            disabled={!cfg.autoEnrolment.available}
            onChange={(autoEnrolment) => set({ autoEnrolment })}
            label="Auto-enrolment (My Future Fund)"
            description={
              cfg.autoEnrolment.available
                ? `You pay ${pct(cfg.autoEnrolment.employeeRate)}, your employer matches ${pct(cfg.autoEnrolment.employerRate)}, and the State adds ${pct(cfg.autoEnrolment.stateRate)} (on pay up to ${eurWhole(cfg.autoEnrolment.earningsCap)}).`
                : 'Starts 1 January 2026 — switch the tax year to 2026 or 2027.'
            }
          />
        </div>
      </Expander>

      <Expander
        icon="payments"
        title="Bonus & overtime"
        summary={extraCount ? `${inputs.bonus.value > 0 ? 'Bonus' : ''}${inputs.bonus.value > 0 && inputs.overtime.length ? ' + ' : ''}${inputs.overtime.length ? `${inputs.overtime.length} overtime rate${inputs.overtime.length > 1 ? 's' : ''}` : ''}` : 'None'}
        badge={extraCount}
      >
        <div class="stack">
          <h3 class="sub-title">Bonus or commission</h3>
          <ButtonGroup
            label="Bonus type"
            size="sm"
            stretch
            value={inputs.bonus.type}
            onChange={(type) => set({ bonus: { ...inputs.bonus, type } })}
            options={[
              { value: 'percent', label: '% of salary', icon: 'percent' },
              { value: 'fixed', label: 'Fixed amount', icon: 'euro' },
            ]}
          />
          <div class="row">
            <NumberField
              label="Bonus"
              prefix={inputs.bonus.type === 'fixed' ? '€' : undefined}
              suffix={inputs.bonus.type === 'percent' ? '% per year' : undefined}
              value={inputs.bonus.value}
              step={inputs.bonus.type === 'percent' ? 1 : 100}
              onChange={(value) => set({ bonus: { ...inputs.bonus, value } })}
            />
            {inputs.bonus.type === 'fixed' && (
              <SelectField
                label="Paid"
                value={inputs.bonus.per}
                options={FREQ_OPTIONS}
                onChange={(per) => set({ bonus: { ...inputs.bonus, per } })}
              />
            )}
          </div>

          <h3 class="sub-title">Overtime</h3>
          {inputs.overtime.map((o, i) => (
            <div class="ot-row">
              <NumberField
                label="Hours"
                value={o.hours}
                step={1}
                onChange={(hours) => set({ overtime: inputs.overtime.map((x, j) => (j === i ? { ...x, hours } : x)) })}
              />
              <SelectField
                label="Every"
                value={o.per}
                options={OT_FREQ}
                onChange={(per) => set({ overtime: inputs.overtime.map((x, j) => (j === i ? { ...x, per } : x)) })}
              />
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
              onClick={() =>
                set({ overtime: [...inputs.overtime, { hours: 5, per: 'week', multiplier: inputs.overtime.length ? 2 : 1.5 }] })
              }
            >
              Add {inputs.overtime.length ? 'another' : 'an'} overtime rate
            </Button>
          )}
          <p class="note">Overtime is paid on your hourly rate, worked out from your salary and work schedule.</p>
        </div>
      </Expander>

      <Expander icon="receipt_long" title="Tax credits & reliefs" summary={creditCount ? `${creditCount} active` : 'Rent, mortgage, health insurance'} badge={creditCount}>
        <div class="stack">
          <Switch
            icon="apartment"
            checked={inputs.rent.enabled}
            onChange={(enabled) => set({ rent: { ...inputs.rent, enabled } })}
            label="Rent Tax Credit"
            description={`20% of rent paid, up to ${eurWhole(married ? cfg.credits.rentCouple : cfg.credits.rentSingle)} a year in ${cfg.year}.`}
          />
          {inputs.rent.enabled && (
            <NumberField
              label="Rent you pay"
              prefix="€"
              suffix="per month"
              value={inputs.rent.monthly}
              step={50}
              onChange={(monthly) => set({ rent: { ...inputs.rent, monthly } })}
            />
          )}
          <Switch
            icon="home"
            checked={inputs.mortgage.enabled && cfg.credits.mortgageInterestCap !== null}
            disabled={cfg.credits.mortgageInterestCap === null}
            onChange={(enabled) => set({ mortgage: { ...inputs.mortgage, enabled } })}
            label="Mortgage Interest Tax Credit"
            description={
              cfg.credits.mortgageInterestCap === null
                ? `Not available in ${cfg.year} — the relief ended after 2026.`
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
                <NumberField
                  label="Gross premium"
                  prefix="€"
                  value={inputs.health.premium}
                  step={50}
                  onChange={(premium) => set({ health: { ...inputs.health, premium } })}
                />
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
            </>
          )}
          <NumberField
            label="Other tax credits"
            prefix="€"
            suffix="per year"
            value={inputs.otherCredits}
            step={50}
            onChange={(otherCredits) => set({ otherCredits })}
            hint="From your Revenue Tax Credit Certificate, e.g. flat-rate expenses, dependent relative, tuition fees."
          />
        </div>
      </Expander>

      <Expander
        icon="schedule"
        title="Work schedule"
        summary={`${s.hoursPerWeek} hrs/week · ${s.daysPerWeek} days · ${s.weeksPerYear} weeks`}
        badge={scheduleChanged ? 1 : 0}
      >
        <div class="stack">
          <div class="row three">
            <NumberField
              label="Hours / week"
              value={s.hoursPerWeek}
              step={0.5}
              max={168}
              onChange={(hoursPerWeek) => set({ schedule: { ...s, hoursPerWeek } })}
            />
            <NumberField
              label="Days / week"
              value={s.daysPerWeek}
              step={0.5}
              max={7}
              onChange={(daysPerWeek) => set({ schedule: { ...s, daysPerWeek } })}
            />
            <NumberField
              label="Weeks / year"
              value={s.weeksPerYear}
              step={1}
              max={53}
              onChange={(weeksPerYear) => set({ schedule: { ...s, weeksPerYear } })}
            />
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
  }[f];
}

function bandHint(inputs: Inputs, cfg: (typeof YEARS)[keyof typeof YEARS]) {
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
  }
}
