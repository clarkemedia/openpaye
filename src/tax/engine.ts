/**
 * OpenPAYE tax engine — pure functions, no UI dependencies.
 * Computes Irish Income Tax, USC and PRSI for a PAYE employee.
 */
import { YEARS, type TaxYear, type UscBand, type YearConfig } from './years';

export type Period = 'year' | 'month' | 'fortnight' | 'week' | 'day' | 'hour';
export type FamilyStatus = 'single' | 'singleParent' | 'marriedOne' | 'marriedTwo';
export type AmountType = 'percent' | 'fixed';

export interface OvertimeRate {
  hours: number;
  per: Period;
  multiplier: number;
}

export interface Inputs {
  year: TaxYear;
  amount: number;
  period: Period;
  /** When true, `amount` is the desired take-home pay */
  reverse: boolean;
  schedule: { weeksPerYear: number; daysPerWeek: number; hoursPerWeek: number };
  overtime: OvertimeRate[];
  bonus: { type: AmountType; value: number; per: Period };
  family: FamilyStatus;
  spouseIncome: number;
  homeCarer: boolean;
  age: number;
  medicalCard: boolean;
  pension: { type: AmountType; value: number; per: Period };
  autoEnrolment: boolean;
  rent: { enabled: boolean; monthly: number };
  mortgage: { enabled: boolean; interest: number; interest2022: number };
  health: { enabled: boolean; premium: number; per: 'year' | 'month'; adults: number; children: number };
  incapacitatedChild: boolean;
  otherCredits: number;
}

export const DEFAULT_INPUTS: Inputs = {
  year: 2026,
  amount: 50000,
  period: 'year',
  reverse: false,
  schedule: { weeksPerYear: 52, daysPerWeek: 5, hoursPerWeek: 39 },
  overtime: [],
  bonus: { type: 'percent', value: 0, per: 'year' },
  family: 'single',
  spouseIncome: 0,
  homeCarer: false,
  age: 30,
  medicalCard: false,
  pension: { type: 'percent', value: 0, per: 'year' },
  autoEnrolment: false,
  rent: { enabled: false, monthly: 1500 },
  mortgage: { enabled: false, interest: 0, interest2022: 0 },
  health: { enabled: false, premium: 1800, per: 'year', adults: 1, children: 0 },
  incapacitatedChild: false,
  otherCredits: 0,
};

export interface Credit {
  key: string;
  label: string;
  amount: number;
  hint?: string;
}

export interface UscLine {
  from: number;
  to: number;
  rate: number;
  amount: number;
}

export interface PrsiLine {
  from: string;
  rate: number;
  share: number;
  amount: number;
}

export interface Result {
  year: TaxYear;
  config: YearConfig;
  // Income
  baseSalary: number;
  overtime: number;
  bonus: number;
  /** Cash gross pay */
  gross: number;
  /** Benefit-in-kind (taxable, non-cash) */
  bik: number;
  // Pension
  pensionContribution: number;
  pensionRelieved: number;
  pensionLimit: number;
  pensionLimitPct: number;
  // Income tax
  taxableIncome: number;
  band: number;
  taxAtStandard: number;
  taxAtHigher: number;
  grossTax: number;
  credits: Credit[];
  creditsTotal: number;
  creditsUsed: number;
  ageExemptionApplied: boolean;
  incomeTax: number;
  // USC
  usc: number;
  uscLines: UscLine[];
  uscExempt: boolean;
  uscReduced: boolean;
  // PRSI
  prsi: number;
  prsiLines: PrsiLine[];
  prsiExempt: boolean;
  prsiCredit: number;
  // Auto-enrolment
  autoEnrolment: { employee: number; employer: number; state: number; eligible: boolean };
  // Totals
  totalTax: number;
  totalDeductions: number;
  net: number;
  effectiveRate: number;
  marginalRate: number;
  marginal: { incomeTax: number; usc: number; prsi: number };
  household?: {
    spouseGross: number;
    spouseIncomeTax: number;
    spouseUsc: number;
    spousePrsi: number;
    spouseNet: number;
    combinedNet: number;
    combinedTax: number;
  };
}

/* ------------------------------------------------------------------ */
/* Period helpers                                                     */
/* ------------------------------------------------------------------ */

export function periodsPerYear(period: Period, s: Inputs['schedule']): number {
  switch (period) {
    case 'year':
      return 1;
    case 'month':
      return 12;
    case 'fortnight':
      return s.weeksPerYear / 2;
    case 'week':
      return s.weeksPerYear;
    case 'day':
      return s.weeksPerYear * s.daysPerWeek;
    case 'hour':
      return s.weeksPerYear * s.hoursPerWeek;
  }
}

export const toAnnual = (v: number, p: Period, s: Inputs['schedule']) => v * periodsPerYear(p, s);
export const fromAnnual = (v: number, p: Period, s: Inputs['schedule']) => v / periodsPerYear(p, s);

const clamp0 = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0);
const round2 = (n: number) => Math.round(n * 100) / 100;

/* ------------------------------------------------------------------ */
/* Building blocks                                                    */
/* ------------------------------------------------------------------ */

export function calcUsc(
  income: number,
  cfg: YearConfig,
  reducedEligible: boolean,
): { total: number; lines: UscLine[]; exempt: boolean; reduced: boolean } {
  if (income <= cfg.usc.exemptionThreshold) {
    return { total: 0, lines: [], exempt: true, reduced: false };
  }
  const reduced = reducedEligible && income <= cfg.usc.reducedIncomeLimit;
  const bands: UscBand[] = reduced ? cfg.usc.reducedBands : cfg.usc.bands;
  const lines: UscLine[] = [];
  let prev = 0;
  for (const b of bands) {
    if (income <= prev) break;
    const top = Math.min(income, b.upTo);
    const amount = (top - prev) * b.rate;
    lines.push({ from: prev, to: top, rate: b.rate, amount });
    prev = b.upTo;
  }
  return { total: lines.reduce((a, l) => a + l.amount, 0), lines, exempt: false, reduced };
}

export function calcPrsi(
  income: number,
  cfg: YearConfig,
  exempt: boolean,
): { total: number; lines: PrsiLine[]; exempt: boolean; credit: number } {
  if (exempt) return { total: 0, lines: [], exempt: true, credit: 0 };
  const weekly = income / 52;
  const { weeklyExemption, creditMax, creditUpper } = cfg.prsi;
  if (weekly <= weeklyExemption) {
    return { total: 0, lines: [], exempt: true, credit: 0 };
  }
  let creditTotal = 0;
  const lines = cfg.prsi.periods.map((p) => {
    const charge = weekly * p.rate;
    const credit = weekly <= creditUpper ? Math.max(0, creditMax - (weekly - weeklyExemption) / 6) : 0;
    const weeks = 52 * p.share;
    creditTotal += Math.min(credit, charge) * weeks;
    return { from: p.from, rate: p.rate, share: p.share, amount: Math.max(0, charge - credit) * weeks };
  });
  return { total: lines.reduce((a, l) => a + l.amount, 0), lines, exempt: false, credit: creditTotal };
}

export function pensionLimitPct(age: number, cfg: YearConfig): number {
  return cfg.pension.ageLimits.find((l) => age >= l.minAge)?.pct ?? 0.15;
}

function taxOnBand(taxable: number, band: number, cfg: YearConfig) {
  const atStd = Math.min(taxable, band) * cfg.incomeTax.standardRate;
  const atHigh = Math.max(0, taxable - band) * cfg.incomeTax.higherRate;
  return { atStd, atHigh, total: atStd + atHigh };
}

/* ------------------------------------------------------------------ */
/* Main calculation                                                   */
/* ------------------------------------------------------------------ */

interface CoreOptions {
  /** Extra euro added to base salary (used for marginal-rate calc) */
  extra?: number;
}

function calculateForBase(inputs: Inputs, baseSalary: number, opts: CoreOptions = {}): Result {
  const cfg = YEARS[inputs.year];
  const s = inputs.schedule;
  const base = clamp0(baseSalary) + (opts.extra ?? 0);

  // --- Gross pay --------------------------------------------------
  const hoursPerYear = Math.max(1, s.weeksPerYear * s.hoursPerWeek);
  const hourly = base / hoursPerYear;
  const overtime = inputs.overtime.reduce(
    (sum, o) => sum + clamp0(o.hours) * periodsPerYear(o.per, s) * hourly * clamp0(o.multiplier),
    0,
  );
  const bonus =
    inputs.bonus.type === 'percent'
      ? (base * clamp0(inputs.bonus.value)) / 100
      : toAnnual(clamp0(inputs.bonus.value), inputs.bonus.per, s);
  const gross = base + overtime + bonus;

  const h = inputs.health;
  const bik = h.enabled ? clamp0(h.premium) * (h.per === 'month' ? 12 : 1) : 0;
  const totalIncome = gross + bik;

  // --- Pension ----------------------------------------------------
  const pensionContribution =
    inputs.pension.type === 'percent'
      ? (base * clamp0(inputs.pension.value)) / 100
      : toAnnual(clamp0(inputs.pension.value), inputs.pension.per, s);
  const limitPct = pensionLimitPct(inputs.age, cfg);
  const pensionLimit = limitPct * Math.min(totalIncome, cfg.pension.earningsCap);
  const pensionRelieved = Math.min(pensionContribution, pensionLimit);

  const taxableIncome = Math.max(0, totalIncome - pensionRelieved);

  // --- Standard rate band ----------------------------------------
  const married = inputs.family === 'marriedOne' || inputs.family === 'marriedTwo';
  const spouseGross = inputs.family === 'marriedTwo' ? clamp0(inputs.spouseIncome) : 0;
  let band: number;
  let spouseBand = 0;
  switch (inputs.family) {
    case 'single':
      band = cfg.incomeTax.bands.single;
      break;
    case 'singleParent':
      band = cfg.incomeTax.bands.singleParent;
      break;
    case 'marriedOne':
      band = cfg.incomeTax.bands.marriedOneIncome;
      break;
    case 'marriedTwo': {
      // Joint assessment: the higher earner takes the base married band,
      // the lower earner gets up to the non-transferable increase (plus any
      // part of the base band the higher earner can't use).
      const baseBand = cfg.incomeTax.bands.marriedOneIncome;
      const inc = cfg.incomeTax.bands.marriedSecondIncomeIncrease;
      const userHigher = taxableIncome >= spouseGross;
      const hi = userHigher ? taxableIncome : spouseGross;
      const lo = userHigher ? spouseGross : taxableIncome;
      const hiBand = baseBand;
      const loBand = Math.min(lo, inc + Math.max(0, baseBand - hi));
      band = userHigher ? hiBand : loBand;
      spouseBand = userHigher ? loBand : hiBand;
      break;
    }
  }

  const t = taxOnBand(taxableIncome, band, cfg);

  // --- Tax credits -------------------------------------------------
  const c = cfg.credits;
  const credits: Credit[] = [];
  const twoIncome = inputs.family === 'marriedTwo';
  const share = twoIncome ? 0.5 : 1;

  credits.push({
    key: 'personal',
    label: married ? 'Personal credit (married)' : 'Personal credit',
    amount: (married ? c.personalMarried : c.personalSingle) * share,
    hint: twoIncome ? 'Married credit split between you and your spouse' : undefined,
  });
  credits.push({
    key: 'employee',
    label: 'Employee (PAYE) credit',
    amount: Math.min(c.employee, totalIncome * cfg.incomeTax.standardRate),
  });
  if (inputs.family === 'singleParent') {
    credits.push({ key: 'spcc', label: 'Single Person Child Carer credit', amount: c.singlePersonChildCarer });
  }
  if (inputs.family === 'marriedOne' && inputs.homeCarer) {
    credits.push({ key: 'homeCarer', label: 'Home Carer credit', amount: c.homeCarer });
  }
  if (inputs.age >= 65) {
    credits.push({ key: 'age', label: 'Age credit', amount: (married ? c.ageMarried : c.ageSingle) * share });
  }
  if (inputs.incapacitatedChild) {
    credits.push({ key: 'incapacitated', label: 'Incapacitated Child credit', amount: c.incapacitatedChild });
  }
  if (inputs.rent.enabled) {
    const cap = (married ? c.rentCouple : c.rentSingle) * share;
    const rentPaid = clamp0(inputs.rent.monthly) * 12 * share;
    credits.push({
      key: 'rent',
      label: 'Rent Tax Credit',
      amount: Math.min(cap, rentPaid * 0.2),
      hint: `20% of rent paid, up to €${cap.toLocaleString('en-IE')}`,
    });
  }
  if (inputs.mortgage.enabled && c.mortgageInterestCap !== null) {
    const increase = Math.max(0, clamp0(inputs.mortgage.interest) - clamp0(inputs.mortgage.interest2022));
    credits.push({
      key: 'mortgage',
      label: 'Mortgage Interest Tax Credit',
      amount: Math.min(c.mortgageInterestCap, increase * c.mortgageInterestRate),
      hint: `20% of the increase in interest over 2022, up to €${c.mortgageInterestCap.toLocaleString('en-IE')}`,
    });
  }
  if (h.enabled && bik > 0) {
    const cap = clamp0(h.adults) * cfg.medicalInsurance.adultCap + clamp0(h.children) * cfg.medicalInsurance.childCap;
    credits.push({
      key: 'medical',
      label: 'Medical insurance relief',
      amount: Math.min(bik, cap) * cfg.medicalInsurance.rate,
      hint: 'Relief on employer-paid health insurance',
    });
  }
  if (clamp0(inputs.otherCredits) > 0) {
    credits.push({ key: 'other', label: 'Other tax credits', amount: clamp0(inputs.otherCredits) });
  }

  // --- Spouse (two-income couple) -----------------------------------
  let household: Result['household'];
  let transferredIn = 0;
  if (twoIncome) {
    const sT = taxOnBand(spouseGross, spouseBand, cfg);
    const spouseTransferable =
      (c.personalMarried / 2) +
      (inputs.age >= 65 ? c.ageMarried / 2 : 0) +
      (inputs.rent.enabled
        ? Math.min(c.rentCouple / 2, clamp0(inputs.rent.monthly) * 12 * 0.5 * 0.2)
        : 0);
    const spouseEmployee = Math.min(c.employee, spouseGross * cfg.incomeTax.standardRate);
    const spouseCredits = spouseTransferable + spouseEmployee;
    // Unused transferable credits (not the PAYE credit) flow to the other spouse
    const spouseUnusedTransferable = Math.max(0, spouseTransferable - Math.max(0, sT.total - spouseEmployee));
    transferredIn = spouseUnusedTransferable;
    const spouseIncomeTax = Math.max(0, sT.total - spouseCredits);
    const sUsc = calcUsc(spouseGross, cfg, false).total;
    const sPrsi = calcPrsi(spouseGross, cfg, false).total;
    household = {
      spouseGross,
      spouseIncomeTax,
      spouseUsc: sUsc,
      spousePrsi: sPrsi,
      spouseNet: spouseGross - spouseIncomeTax - sUsc - sPrsi,
      combinedNet: 0,
      combinedTax: 0,
    };
  }
  if (transferredIn > 0) {
    credits.push({
      key: 'transfer',
      label: 'Credits transferred from spouse',
      amount: transferredIn,
      hint: "Your spouse's unused personal credits",
    });
  }

  const creditsTotal = credits.reduce((a, cr) => a + cr.amount, 0);
  let incomeTax = Math.max(0, t.total - creditsTotal);

  // Age exemption (65+) with marginal relief
  let ageExemptionApplied = false;
  if (inputs.age >= 65) {
    const limit = married ? cfg.ageExemption.married : cfg.ageExemption.single;
    const income = taxableIncome + spouseGross;
    if (income <= limit) {
      incomeTax = 0;
      ageExemptionApplied = true;
    } else {
      const marginalCap = (income - limit) * cfg.incomeTax.higherRate;
      if (marginalCap < incomeTax) {
        incomeTax = marginalCap;
        ageExemptionApplied = true;
      }
    }
  }
  const creditsUsed = Math.min(creditsTotal, t.total);

  // --- USC & PRSI ---------------------------------------------------
  const uscR = calcUsc(totalIncome, cfg, inputs.medicalCard || inputs.age >= 70);
  const prsiR = calcPrsi(totalIncome, cfg, inputs.age >= 66);

  // --- Auto-enrolment ----------------------------------------------
  const ae = cfg.autoEnrolment;
  const aeOn = ae.available && inputs.autoEnrolment;
  const aeBase = Math.min(gross, ae.earningsCap);
  const autoEnrolment = {
    employee: aeOn ? aeBase * ae.employeeRate : 0,
    employer: aeOn ? aeBase * ae.employerRate : 0,
    state: aeOn ? aeBase * ae.stateRate : 0,
    eligible: ae.available && gross >= ae.minEarnings && inputs.age >= 23 && inputs.age <= 60,
  };

  const totalTax = incomeTax + uscR.total + prsiR.total;
  const totalDeductions = totalTax + pensionContribution + autoEnrolment.employee;
  const net = gross - totalDeductions;

  if (household) {
    household.combinedNet = net + household.spouseNet;
    household.combinedTax =
      totalTax + household.spouseIncomeTax + household.spouseUsc + household.spousePrsi;
  }

  return {
    year: inputs.year,
    config: cfg,
    baseSalary: base,
    overtime,
    bonus,
    gross,
    bik,
    pensionContribution,
    pensionRelieved,
    pensionLimit,
    pensionLimitPct: limitPct,
    taxableIncome,
    band,
    taxAtStandard: t.atStd,
    taxAtHigher: t.atHigh,
    grossTax: t.total,
    credits,
    creditsTotal,
    creditsUsed,
    ageExemptionApplied,
    incomeTax,
    usc: uscR.total,
    uscLines: uscR.lines,
    uscExempt: uscR.exempt,
    uscReduced: uscR.reduced,
    prsi: prsiR.total,
    prsiLines: prsiR.lines,
    prsiExempt: prsiR.exempt,
    prsiCredit: prsiR.credit,
    autoEnrolment,
    totalTax,
    totalDeductions,
    net,
    effectiveRate: totalIncome > 0 ? totalTax / totalIncome : 0,
    marginalRate: 0,
    marginal: { incomeTax: 0, usc: 0, prsi: 0 },
    household,
  };
}

/** Find the base salary that produces a target annual net pay. */
export function solveGrossForNet(inputs: Inputs, targetNetAnnual: number): number {
  if (targetNetAnnual <= 0) return 0;
  let lo = 0;
  let hi = Math.max(1000, targetNetAnnual * 4);
  while (calculateForBase(inputs, hi).net < targetNetAnnual && hi < 1e9) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (calculateForBase(inputs, mid).net < targetNetAnnual) lo = mid;
    else hi = mid;
  }
  return round2(hi);
}

/** Resolve the annual base salary implied by the inputs (handles reverse mode). */
export function resolveBaseSalary(inputs: Inputs): number {
  const annual = toAnnual(clamp0(inputs.amount), inputs.period, inputs.schedule);
  return inputs.reverse ? solveGrossForNet(inputs, annual) : annual;
}

const MARGINAL_STEP = 100;

export function calculateForSalary(inputs: Inputs, baseSalary: number): Result {
  const r = calculateForBase(inputs, baseSalary);
  const r2 = calculateForBase(inputs, baseSalary, { extra: MARGINAL_STEP });
  const dGross = r2.gross + r2.bik - (r.gross + r.bik);
  if (dGross > 0) {
    r.marginal = {
      incomeTax: (r2.incomeTax - r.incomeTax) / dGross,
      usc: (r2.usc - r.usc) / dGross,
      prsi: (r2.prsi - r.prsi) / dGross,
    };
    r.marginalRate = (r2.totalTax - r.totalTax) / dGross;
  }
  return r;
}

export function calculate(inputs: Inputs): Result {
  return calculateForSalary(inputs, resolveBaseSalary(inputs));
}
