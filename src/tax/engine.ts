/**
 * OpenPAYE tax engine. Pure functions, no UI dependencies.
 * Computes Irish Income Tax, USC and PRSI for a PAYE employee, their spouse
 * (joint assessment), and any other income they have.
 */
import { YEARS, type TaxYear, type UscBand, type YearConfig } from './years';

export type Period = 'year' | 'month' | 'fortnight' | 'week' | 'day' | 'hour';
export type FamilyStatus = 'single' | 'singleParent' | 'marriedOne' | 'marriedTwo' | 'widowed';
export type AmountType = 'percent' | 'fixed';
export type CarCategory = 'A1' | 'A' | 'B' | 'C' | 'D' | 'E';
export type AscScheme = 'standard' | 'fast' | 'single';

export interface OvertimeRate {
  hours: number;
  per: Period;
  multiplier: number;
}

export interface AmountSetting {
  type: AmountType;
  value: number;
  per: Period;
}

export interface SpouseInputs {
  salary: number;
  bonus: number;
  pension: AmountSetting;
  /** AVCs, per year */
  avc: number;
  autoEnrolment: boolean;
  age: number;
  medicalCard: boolean;
  /** Taxable benefits-in-kind, per year */
  bik: number;
}

export interface Inputs {
  year: TaxYear;
  amount: number;
  period: Period;
  /** When true, `amount` is the desired take-home pay */
  reverse: boolean;
  schedule: { weeksPerYear: number; daysPerWeek: number; hoursPerWeek: number };
  overtime: OvertimeRate[];
  bonus: AmountSetting;
  /** Bonus planner: share of the bonus paid into your pension, and whether to show it apart from regular pay */
  bonusPlan: { toPensionPct: number; separate: boolean };
  family: FamilyStatus;
  spouse: SpouseInputs;
  homeCarer: boolean;
  age: number;
  medicalCard: boolean;
  blind: { you: boolean; spouse: boolean };
  dependentRelatives: number;
  /** capToRelief: only contribute up to the amount that gets tax relief */
  pension: AmountSetting & { capToRelief?: boolean };
  /** Additional Voluntary Contributions, on top of the main pension */
  avc: AmountSetting;
  autoEnrolment: boolean;
  rent: { enabled: boolean; monthly: number };
  mortgage: { enabled: boolean; interest: number; interest2022: number };
  health: { enabled: boolean; premium: number; per: 'year' | 'month'; adults: number; children: number };
  car: { enabled: boolean; omv: number; category: CarCategory; businessKm: number; contribution: number };
  loan: { enabled: boolean; amount: number; rate: number; kind: 'home' | 'other' };
  /** Other taxable benefits (club subscriptions, etc.), per year */
  otherBik: number;
  shares: {
    espp: AmountSetting & { discount: number };
    /** Value of shares received through an Approved Profit Sharing Scheme, per year */
    apss: number;
    /** Value of RSUs vesting, per year */
    rsu: number;
    rsuSellToCover: boolean;
  };
  flatRateExpenses: number;
  /** Yearly cost of a TaxSaver commuter ticket bought through salary sacrifice */
  taxSaver: number;
  remote: { enabled: boolean; bills: number; days: number; allowance: number };
  publicSector: { enabled: boolean; scheme: AscScheme; classD: boolean };
  otherIncome: { selfEmployed: number; rental: number; rentARoom: number; investment: number; statePension: number };
  incapacitatedChild: boolean;
  otherCredits: number;
  /** Use the PRSI rate in force today, instead of the yearly average */
  payslipMode: boolean;
}

export const DEFAULT_INPUTS: Inputs = {
  year: 2026,
  amount: 50000,
  period: 'year',
  reverse: false,
  schedule: { weeksPerYear: 52, daysPerWeek: 5, hoursPerWeek: 39 },
  overtime: [],
  bonus: { type: 'percent', value: 0, per: 'year' },
  bonusPlan: { toPensionPct: 0, separate: false },
  family: 'single',
  spouse: {
    salary: 0,
    bonus: 0,
    pension: { type: 'percent', value: 0, per: 'year' },
    avc: 0,
    autoEnrolment: false,
    age: 30,
    medicalCard: false,
    bik: 0,
  },
  homeCarer: false,
  age: 30,
  medicalCard: false,
  blind: { you: false, spouse: false },
  dependentRelatives: 0,
  pension: { type: 'percent', value: 0, per: 'year', capToRelief: false },
  avc: { type: 'fixed', value: 0, per: 'month' },
  autoEnrolment: false,
  rent: { enabled: false, monthly: 1500 },
  mortgage: { enabled: false, interest: 0, interest2022: 0 },
  health: { enabled: false, premium: 1800, per: 'year', adults: 1, children: 0 },
  car: { enabled: false, omv: 40000, category: 'C', businessKm: 10000, contribution: 0 },
  loan: { enabled: false, amount: 0, rate: 0, kind: 'other' },
  otherBik: 0,
  shares: {
    espp: { type: 'percent', value: 0, per: 'month', discount: 15 },
    apss: 0,
    rsu: 0,
    rsuSellToCover: true,
  },
  flatRateExpenses: 0,
  taxSaver: 0,
  remote: { enabled: false, bills: 2500, days: 100, allowance: 0 },
  publicSector: { enabled: false, scheme: 'standard', classD: false },
  otherIncome: { selfEmployed: 0, rental: 0, rentARoom: 0, investment: 0, statePension: 0 },
  incapacitatedChild: false,
  otherCredits: 0,
  payslipMode: false,
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

export interface Line {
  key: string;
  label: string;
  amount: number;
  hint?: string;
}

export interface Result {
  year: TaxYear;
  config: YearConfig;
  // Income
  baseSalary: number;
  overtime: number;
  bonus: number;
  /** Part of the bonus paid into the pension (bonus planner) */
  bonusToPension: number;
  /** Cash gross pay from employment */
  gross: number;
  /** Pay given up for a TaxSaver ticket: no Income Tax, USC or PRSI on it */
  taxSaver: number;
  /** All taxable non-cash benefits (health insurance, car, loan, other) */
  bik: number;
  bikLines: Line[];
  shares: {
    esppContribution: number;
    esppBenefit: number;
    esppSharesValue: number;
    apss: number;
    apssTaxFree: number;
    rsu: number;
    /** Tax caused by the RSUs (paid by selling shares when sellToCover is on) */
    rsuTax: number;
    sellToCover: boolean;
  };
  otherIncome: Line[];
  otherIncomeTotal: number;
  /** Everything that counts as income, cash or not */
  totalIncome: number;
  // Pension
  pensionMain: number;
  avc: number;
  pensionContribution: number;
  /** What the pension settings ask for, before any cap to the relief limit */
  pensionRequested: number;
  pensionRelieved: number;
  pensionLimit: number;
  pensionLimitPct: number;
  /** Public sector Additional Superannuation Contribution */
  asc: number;
  /** Income tax deductions other than pension: ASC, flat rate expenses, remote working */
  deductions: Line[];
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
  uscSurcharge: number;
  uscExempt: boolean;
  uscReduced: boolean;
  // PRSI
  prsi: number;
  prsiLines: PrsiLine[];
  prsiOther: Line[];
  prsiExempt: boolean;
  prsiCredit: number;
  prsiClass: 'A' | 'D';
  payslipRate?: { from: string; rate: number };
  // Auto-enrolment
  autoEnrolment: { employee: number; employer: number; state: number; eligible: boolean };
  // Totals
  totalTax: number;
  totalDeductions: number;
  /** Cash take-home: pay and other income, less tax, pensions, ASC and share purchases */
  net: number;
  effectiveRate: number;
  marginalRate: number;
  marginal: { incomeTax: number; usc: number; prsi: number };
  household?: {
    spouseGross: number;
    spouseBik: number;
    spousePension: number;
    spouseAutoEnrolment: number;
    spouseIncomeTax: number;
    spouseUsc: number;
    spousePrsi: number;
    spouseNet: number;
    spouseBand: number;
    combinedGross: number;
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
const sum = (xs: { amount: number }[]) => xs.reduce((a, x) => a + x.amount, 0);
const eurLabel = (n: number) => `€${Math.round(n).toLocaleString('en-IE')}`;

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
    lines.push({ from: prev, to: top, rate: b.rate, amount: (top - prev) * b.rate });
    prev = b.upTo;
  }
  return { total: sum(lines), lines, exempt: false, reduced };
}

type RatePeriod = { from: string; share: number; rate: number };

/** Index of the PRSI period in force "now" for a given tax year (payslip mode). */
export function currentPeriodIndex(year: number, now = new Date()): number {
  const y = now.getFullYear();
  if (year < y) return 1;
  if (year > y) return 0;
  return now.getMonth() >= 9 ? 1 : 0; // October onwards
}

function payslipPeriods<T extends { share: number }>(periods: T[], year: number, on: boolean): T[] {
  if (!on) return periods;
  return [{ ...periods[currentPeriodIndex(year)], share: 1 }];
}

/** Class A employee PRSI, with the weekly exemption and tapered credit. */
export function calcPrsi(
  income: number,
  cfg: YearConfig,
  exempt: boolean,
  periods: RatePeriod[] = cfg.prsi.periods,
): { total: number; lines: PrsiLine[]; exempt: boolean; credit: number } {
  if (exempt) return { total: 0, lines: [], exempt: true, credit: 0 };
  const weekly = income / 52;
  const { weeklyExemption, creditMax, creditUpper } = cfg.prsi;
  if (weekly <= weeklyExemption) return { total: 0, lines: [], exempt: true, credit: 0 };
  let creditTotal = 0;
  const lines = periods.map((p) => {
    const charge = weekly * p.rate;
    const credit = weekly <= creditUpper ? Math.max(0, creditMax - (weekly - weeklyExemption) / 6) : 0;
    const weeks = 52 * p.share;
    creditTotal += Math.min(credit, charge) * weeks;
    return { from: p.from, rate: p.rate, share: p.share, amount: Math.max(0, charge - credit) * weeks };
  });
  return { total: sum(lines), lines, exempt: false, credit: creditTotal };
}

/** Class D PRSI (public servants recruited before 6 April 1995). */
function calcPrsiClassD(income: number, cfg: YearConfig, exempt: boolean, payslip: boolean) {
  const d = cfg.extra.classD;
  const weekly = income / 52;
  if (exempt || weekly <= cfg.prsi.weeklyExemption) return { total: 0, lines: [] as PrsiLine[], exempt: true, credit: 0 };
  const lines: PrsiLine[] = payslipPeriods(d.periods, cfg.year, payslip).map((p) => {
    const perWeek =
      weekly <= d.lowerWeekly ? weekly * p.low : Math.min(weekly, d.firstBand) * p.low + Math.max(0, weekly - d.firstBand) * p.balance;
    return { from: p.from, rate: weekly > d.firstBand ? p.balance : p.low, share: p.share, amount: perWeek * 52 * p.share };
  });
  return { total: sum(lines), lines, exempt: false, credit: 0 };
}

export function pensionLimitPct(age: number, cfg: YearConfig): number {
  return cfg.pension.ageLimits.find((l) => age >= l.minAge)?.pct ?? 0.15;
}

function taxOnBand(taxable: number, band: number, cfg: YearConfig) {
  const atStd = Math.min(taxable, band) * cfg.incomeTax.standardRate;
  const atHigh = Math.max(0, taxable - band) * cfg.incomeTax.higherRate;
  return { atStd, atHigh, total: atStd + atHigh };
}

const CAR_PCT: Record<CarCategory, number[]> = {
  A1: [0.15, 0.12, 0.09, 0.06],
  A: [0.225, 0.18, 0.135, 0.09],
  B: [0.2625, 0.21, 0.1575, 0.105],
  C: [0.3, 0.24, 0.18, 0.12],
  D: [0.3375, 0.27, 0.2025, 0.135],
  E: [0.375, 0.3, 0.225, 0.15],
};

/** Taxable value of a company car for the year. */
export function carBenefit(car: Inputs['car'], cfg: YearConfig) {
  if (!car.enabled) return 0;
  const { universalReduction, evReduction, hasA1 } = cfg.extra.car;
  const zeroEmission = car.category === 'A1';
  const cat: CarCategory = zeroEmission && !hasA1 ? 'A' : car.category;
  const km = clamp0(car.businessKm);
  const band = km <= 26000 ? 0 : km <= 39000 ? 1 : km <= 48000 ? 2 : 3;
  const reduction = (car.category === 'E' ? 0 : universalReduction) + (zeroEmission ? evReduction : 0);
  const value = Math.max(0, clamp0(car.omv) - reduction) * CAR_PCT[cat][band];
  return Math.max(0, value - clamp0(car.contribution));
}

export function ascAmount(pensionable: number, scheme: AscScheme, cfg: YearConfig) {
  const a = cfg.extra.asc;
  if (scheme === 'single') {
    return Math.max(0, Math.min(pensionable, a.band2) - a.exempt) * a.singleRate1 + Math.max(0, pensionable - a.band2) * a.singleRate2;
  }
  const exempt = scheme === 'fast' ? a.fastExempt : a.exempt;
  return Math.max(0, Math.min(pensionable, a.band2) - exempt) * a.rate1 + Math.max(0, pensionable - a.band2) * a.rate2;
}

/* ------------------------------------------------------------------ */
/* One person's income and deductions (before joint assessment)       */
/* ------------------------------------------------------------------ */

interface Person {
  base: number;
  overtime: number;
  bonus: number;
  bonusToPension: number;
  gross: number;
  /** Salary sacrificed for a TaxSaver ticket */
  sacrifice: number;
  bik: number;
  bikLines: Line[];
  /** ESPP discount + RSUs: Income Tax, USC and PRSI */
  shareIncome: number;
  apss: number;
  apssTaxable: number;
  esppContribution: number;
  esppBenefit: number;
  rsu: number;
  selfEmployed: number;
  /** Rental + investment + rent-a-room over the limit */
  unearned: number;
  statePension: number;
  otherIncome: Line[];
  pensionMain: number;
  avc: number;
  pensionRequested: number;
  pensionContribution: number;
  pensionRelieved: number;
  pensionLimit: number;
  limitPct: number;
  asc: number;
  deductions: Line[];
  taxable: number;
  /** Employment income, used for the PAYE credit */
  employmentIncome: number;
  age: number;
  medicalCard: boolean;
  autoEnrolment: Result['autoEnrolment'];
}

function buildPerson(inputs: Inputs, cfg: YearConfig, base: number, isSpouse: boolean): Person {
  const s = inputs.schedule;
  const sp = inputs.spouse;
  const age = isSpouse ? sp.age : inputs.age;

  // Pay
  const hourly = base / Math.max(1, s.weeksPerYear * s.hoursPerWeek);
  const overtime = isSpouse
    ? 0
    : inputs.overtime.reduce((t, o) => t + clamp0(o.hours) * periodsPerYear(o.per, s) * hourly * clamp0(o.multiplier), 0);
  const bonus = isSpouse
    ? clamp0(sp.bonus)
    : inputs.bonus.type === 'percent'
      ? (base * clamp0(inputs.bonus.value)) / 100
      : toAnnual(clamp0(inputs.bonus.value), inputs.bonus.per, s);
  const bonusToPension = isSpouse ? 0 : (bonus * Math.min(100, clamp0(inputs.bonusPlan.toPensionPct))) / 100;
  const gross = base + overtime + bonus;
  // A TaxSaver ticket bought through salary sacrifice comes out of pay before any tax
  const sacrifice = isSpouse ? 0 : Math.min(clamp0(inputs.taxSaver), gross);
  const pay = gross - sacrifice;

  // Benefits-in-kind
  const bikLines: Line[] = [];
  if (isSpouse) {
    if (clamp0(sp.bik) > 0) bikLines.push({ key: 'bik', label: 'Benefits-in-kind', amount: clamp0(sp.bik) });
  } else {
    const h = inputs.health;
    if (h.enabled && clamp0(h.premium) > 0)
      bikLines.push({ key: 'health', label: 'Health insurance', amount: clamp0(h.premium) * (h.per === 'month' ? 12 : 1) });
    const car = carBenefit(inputs.car, cfg);
    if (car > 0) bikLines.push({ key: 'car', label: 'Company car', amount: car });
    if (inputs.loan.enabled) {
      const specified = inputs.loan.kind === 'home' ? cfg.extra.loanRates.home : cfg.extra.loanRates.other;
      const benefit = clamp0(inputs.loan.amount) * Math.max(0, specified - clamp0(inputs.loan.rate) / 100);
      if (benefit > 0)
        bikLines.push({
          key: 'loan',
          label: 'Preferential loan',
          amount: benefit,
          hint: `interest below the ${(specified * 100).toFixed(1).replace('.0', '')}% specified rate`,
        });
    }
    if (clamp0(inputs.otherBik) > 0) bikLines.push({ key: 'other', label: 'Other benefits', amount: clamp0(inputs.otherBik) });
  }
  const bik = sum(bikLines);

  // Shares (you only)
  const sh = inputs.shares;
  const esppContribution = isSpouse
    ? 0
    : sh.espp.type === 'percent'
      ? (base * clamp0(sh.espp.value)) / 100
      : toAnnual(clamp0(sh.espp.value), sh.espp.per, s);
  const discount = Math.min(0.9, clamp0(sh.espp.discount) / 100);
  // Shares bought at a discount: market value = contribution ÷ (1 − discount); the difference is taxed as pay
  const esppBenefit = discount > 0 ? (esppContribution * discount) / (1 - discount) : 0;
  const rsu = isSpouse ? 0 : clamp0(sh.rsu);
  const apss = isSpouse ? 0 : clamp0(sh.apss);
  const apssTaxable = Math.max(0, apss - cfg.extra.apssLimit);

  // Other income (you only)
  const oi = inputs.otherIncome;
  const selfEmployed = isSpouse ? 0 : clamp0(oi.selfEmployed);
  const rental = isSpouse ? 0 : clamp0(oi.rental);
  const rentARoomGross = isSpouse ? 0 : clamp0(oi.rentARoom);
  // Over the limit, the whole amount is taxable as rental income
  const rentARoomTaxable = rentARoomGross > cfg.extra.rentARoomLimit ? rentARoomGross : 0;
  const investment = isSpouse ? 0 : clamp0(oi.investment);
  const statePension = isSpouse ? 0 : clamp0(oi.statePension);
  const otherIncome: Line[] = [];
  if (selfEmployed) otherIncome.push({ key: 'self', label: 'Self-employed profit', amount: selfEmployed });
  if (rental) otherIncome.push({ key: 'rental', label: 'Rental profit', amount: rental });
  if (rentARoomGross)
    otherIncome.push({
      key: 'rentARoom',
      label: 'Rent-a-room income',
      amount: rentARoomGross,
      hint: rentARoomTaxable
        ? `over the ${eurLabel(cfg.extra.rentARoomLimit)} limit, so all of it is taxable`
        : `tax-free up to ${eurLabel(cfg.extra.rentARoomLimit)}`,
    });
  if (investment) otherIncome.push({ key: 'investment', label: 'Investment income', amount: investment });
  if (statePension) otherIncome.push({ key: 'statePension', label: 'State pension', amount: statePension });

  // Pension: main + AVC (+ bonus paid in), relief capped at age % of earnings up to €115,000
  const pensionSetting = isSpouse ? sp.pension : inputs.pension;
  const pensionMain =
    pensionSetting.type === 'percent' ? (base * clamp0(pensionSetting.value)) / 100 : toAnnual(clamp0(pensionSetting.value), pensionSetting.per, s);
  const avc = isSpouse
    ? clamp0(sp.avc)
    : (inputs.avc.type === 'percent' ? (base * clamp0(inputs.avc.value)) / 100 : toAnnual(clamp0(inputs.avc.value), inputs.avc.per, s)) + bonusToPension;
  const limitPct = pensionLimitPct(age, cfg);
  const pensionLimit = limitPct * Math.min(pay + bik + selfEmployed, cfg.pension.earningsCap);
  const pensionRequested = pensionMain + avc;
  const capToRelief = !isSpouse && !!inputs.pension.capToRelief;
  const pensionContribution = capToRelief ? Math.min(pensionRequested, pensionLimit) : pensionRequested;
  const pensionRelieved = Math.min(pensionContribution, pensionLimit);

  // Other income tax deductions
  const deductions: Line[] = [];
  const ps = inputs.publicSector;
  const asc = !isSpouse && ps.enabled ? ascAmount(base, ps.scheme, cfg) : 0;
  if (asc > 0) deductions.push({ key: 'asc', label: 'Additional Superannuation Contribution (ASC)', amount: asc });
  if (!isSpouse && clamp0(inputs.flatRateExpenses) > 0)
    deductions.push({ key: 'fre', label: 'Flat rate expenses', amount: clamp0(inputs.flatRateExpenses) });
  if (!isSpouse && inputs.remote.enabled) {
    const r = inputs.remote;
    const relief = Math.max(0, (clamp0(r.bills) * Math.min(366, clamp0(r.days))) / 365 - clamp0(r.allowance)) * cfg.extra.remoteWorkingRate;
    if (relief > 0)
      deductions.push({ key: 'remote', label: 'Remote working relief', amount: relief, hint: `30% of bills for ${Math.round(clamp0(r.days))} days at home` });
  }

  const shareIncome = esppBenefit + rsu;
  const taxable = Math.max(
    0,
    pay + bik + shareIncome + apssTaxable + selfEmployed + rental + rentARoomTaxable + investment + statePension - pensionRelieved - sum(deductions),
  );

  // Auto-enrolment
  const ae = cfg.autoEnrolment;
  const aeOn = ae.available && (isSpouse ? sp.autoEnrolment : inputs.autoEnrolment);
  const aeBase = Math.min(pay, ae.earningsCap);
  const autoEnrolment = {
    employee: aeOn ? aeBase * ae.employeeRate : 0,
    employer: aeOn ? aeBase * ae.employerRate : 0,
    state: aeOn ? aeBase * ae.stateRate : 0,
    eligible: ae.available && gross >= ae.minEarnings && age >= 23 && age <= 60,
  };

  return {
    base,
    overtime,
    bonus,
    bonusToPension,
    gross,
    sacrifice,
    bik,
    bikLines,
    shareIncome,
    apss,
    apssTaxable,
    esppContribution,
    esppBenefit,
    rsu,
    selfEmployed,
    unearned: rental + rentARoomTaxable + investment,
    statePension,
    otherIncome,
    pensionMain,
    avc,
    pensionRequested,
    pensionContribution,
    pensionRelieved,
    pensionLimit,
    limitPct,
    asc,
    deductions,
    taxable,
    employmentIncome: pay + bik + shareIncome + apssTaxable,
    age,
    medicalCard: isSpouse ? sp.medicalCard : inputs.medicalCard,
    autoEnrolment,
  };
}

/** USC and PRSI for one person. */
function socialCharges(p: Person, inputs: Inputs, cfg: YearConfig, isSpouse: boolean) {
  // USC: everything except the State pension (a social welfare payment)
  const uscIncome = p.gross - p.sacrifice + p.bik + p.shareIncome + p.apss + p.selfEmployed + p.unearned;
  const uscR = calcUsc(uscIncome, cfg, p.medicalCard || p.age >= 70);
  const nonPaye = p.selfEmployed + p.unearned;
  const surcharge = uscR.exempt ? 0 : Math.max(0, nonPaye - cfg.extra.uscSurcharge.threshold) * cfg.extra.uscSurcharge.rate;

  // PRSI on employment income (Class A, or Class D for pre-1995 public servants)
  const exempt = p.age >= 66;
  const classD = !isSpouse && inputs.publicSector.enabled && inputs.publicSector.classD;
  const employment = p.gross - p.sacrifice + p.bik + p.shareIncome + p.apss;
  const periods = payslipPeriods(cfg.prsi.periods, cfg.year, inputs.payslipMode);
  const prsiR = classD ? calcPrsiClassD(employment, cfg, exempt, inputs.payslipMode) : calcPrsi(employment, cfg, exempt, periods);

  // PRSI on self-employed (Class S, €650 minimum) and unearned income (Class K)
  const prsiOther: Line[] = [];
  if (!exempt) {
    const blended = periods.reduce((a, x) => a + x.rate * x.share, 0);
    const t = cfg.extra.otherIncomePrsiThreshold;
    if (p.selfEmployed >= t) {
      const amount = classD ? p.selfEmployed * blended : Math.max(cfg.extra.selfEmployedPrsiMinimum, p.selfEmployed * blended);
      prsiOther.push({ key: 'classS', label: classD ? 'PRSI Class K on self-employed income' : 'PRSI Class S on self-employed income', amount });
    }
    if (p.unearned > t) prsiOther.push({ key: 'classK', label: 'PRSI on rental and investment income', amount: p.unearned * blended });
  }
  return { uscR, surcharge, prsiR, prsiOther, classD };
}

/* ------------------------------------------------------------------ */
/* Main calculation                                                   */
/* ------------------------------------------------------------------ */

interface CoreOptions {
  /** Extra euro added to base salary (used for marginal-rate calc) */
  extra?: number;
  /** Internal: skip working out the RSU share of tax */
  noRsuSplit?: boolean;
}

function calculateForBase(inputs: Inputs, baseSalary: number, opts: CoreOptions = {}): Result {
  const cfg = YEARS[inputs.year];
  const c = cfg.credits;
  const x = cfg.extra;
  const base = clamp0(baseSalary) + (opts.extra ?? 0);

  const twoIncome = inputs.family === 'marriedTwo';
  const married = inputs.family === 'marriedOne' || twoIncome;
  const you = buildPerson(inputs, cfg, base, false);
  const sp = twoIncome ? buildPerson(inputs, cfg, clamp0(inputs.spouse.salary), true) : null;

  // --- Standard rate band (joint assessment for two-income couples) ---
  let band: number;
  let spouseBand = 0;
  switch (inputs.family) {
    case 'single':
    case 'widowed':
      band = cfg.incomeTax.bands.single;
      break;
    case 'singleParent':
      band = cfg.incomeTax.bands.singleParent;
      break;
    case 'marriedOne':
      band = cfg.incomeTax.bands.marriedOneIncome;
      break;
    case 'marriedTwo': {
      // The higher earner takes the base married band; the lower earner gets up to
      // the non-transferable increase, plus any base band the higher earner can't use.
      const baseBand = cfg.incomeTax.bands.marriedOneIncome;
      const inc = cfg.incomeTax.bands.marriedSecondIncomeIncrease;
      const spTaxable = sp!.taxable;
      const userHigher = you.taxable >= spTaxable;
      const hi = userHigher ? you.taxable : spTaxable;
      const lo = userHigher ? spTaxable : you.taxable;
      const loBand = Math.min(lo, inc + Math.max(0, baseBand - hi));
      band = userHigher ? baseBand : loBand;
      spouseBand = userHigher ? loBand : baseBand;
      break;
    }
  }
  const t = taxOnBand(you.taxable, band, cfg);

  // --- Tax credits -----------------------------------------------------
  const credits: Credit[] = [];
  const share = twoIncome ? 0.5 : 1;
  const personal = inputs.family === 'widowed' ? x.widowed : married ? c.personalMarried : c.personalSingle;
  credits.push({
    key: 'personal',
    label: inputs.family === 'widowed' ? 'Widowed person credit' : married ? 'Personal credit (married)' : 'Personal credit',
    amount: personal * share,
    hint: twoIncome ? 'Married credit split between you and your spouse' : undefined,
  });
  const employeeCredit = Math.min(c.employee, you.employmentIncome * cfg.incomeTax.standardRate);
  if (employeeCredit > 0) credits.push({ key: 'employee', label: 'Employee (PAYE) credit', amount: employeeCredit });
  if (you.selfEmployed > 0) {
    // Earned Income credit, capped so it and the PAYE credit together don't exceed the PAYE credit amount
    const eic = Math.min(x.earnedIncome, you.selfEmployed * cfg.incomeTax.standardRate, Math.max(0, c.employee - employeeCredit));
    if (eic > 0) credits.push({ key: 'eic', label: 'Earned Income credit', amount: eic });
  }
  if (inputs.family === 'singleParent') credits.push({ key: 'spcc', label: 'Single Person Child Carer credit', amount: c.singlePersonChildCarer });
  if (inputs.family === 'marriedOne' && inputs.homeCarer) credits.push({ key: 'homeCarer', label: 'Home Carer credit', amount: c.homeCarer });
  const anyone65 = inputs.age >= 65 || (twoIncome && inputs.spouse.age >= 65);
  if (anyone65) credits.push({ key: 'age', label: 'Age credit', amount: (married ? c.ageMarried : c.ageSingle) * share });
  const blindCount = (inputs.blind.you ? 1 : 0) + (married && inputs.blind.spouse ? 1 : 0);
  const blindCredit = blindCount === 2 ? x.blindBoth : blindCount === 1 ? x.blindSingle : 0;
  if (blindCredit) credits.push({ key: 'blind', label: 'Blind Person credit', amount: blindCredit * share });
  const deps = Math.round(clamp0(inputs.dependentRelatives));
  if (deps > 0) credits.push({ key: 'dependent', label: 'Dependent Relative credit', amount: x.dependentRelative * deps });
  if (inputs.incapacitatedChild) credits.push({ key: 'incapacitated', label: 'Incapacitated Child credit', amount: c.incapacitatedChild });
  if (inputs.rent.enabled) {
    const cap = (married ? c.rentCouple : c.rentSingle) * share;
    const rentPaid = clamp0(inputs.rent.monthly) * 12 * share;
    credits.push({ key: 'rent', label: 'Rent Tax Credit', amount: Math.min(cap, rentPaid * 0.2), hint: `20% of rent paid, up to ${eurLabel(cap)}` });
  }
  if (inputs.mortgage.enabled && c.mortgageInterestCap !== null) {
    const increase = Math.max(0, clamp0(inputs.mortgage.interest) - clamp0(inputs.mortgage.interest2022));
    credits.push({
      key: 'mortgage',
      label: 'Mortgage Interest Tax Credit',
      amount: Math.min(c.mortgageInterestCap, increase * c.mortgageInterestRate),
      hint: `20% of the increase in interest over 2022, up to ${eurLabel(c.mortgageInterestCap)}`,
    });
  }
  const health = you.bikLines.find((l) => l.key === 'health');
  if (health) {
    const h = inputs.health;
    const cap = clamp0(h.adults) * cfg.medicalInsurance.adultCap + clamp0(h.children) * cfg.medicalInsurance.childCap;
    credits.push({
      key: 'medical',
      label: 'Medical insurance relief',
      amount: Math.min(health.amount, cap) * cfg.medicalInsurance.rate,
      hint: 'Relief on employer-paid health insurance',
    });
  }
  if (clamp0(inputs.otherCredits) > 0) credits.push({ key: 'other', label: 'Other tax credits', amount: clamp0(inputs.otherCredits) });

  // --- Spouse (joint assessment) -----------------------------------------
  let household: Result['household'];
  if (sp) {
    const sT = taxOnBand(sp.taxable, spouseBand, cfg);
    const transferable =
      c.personalMarried / 2 +
      (anyone65 ? c.ageMarried / 2 : 0) +
      blindCredit / 2 +
      (inputs.rent.enabled ? Math.min(c.rentCouple / 2, clamp0(inputs.rent.monthly) * 12 * 0.5 * 0.2) : 0);
    const spouseEmployee = Math.min(c.employee, sp.employmentIncome * cfg.incomeTax.standardRate);
    // Unused transferable credits (not the PAYE credit) flow to the other spouse
    const unused = Math.max(0, transferable - Math.max(0, sT.total - spouseEmployee));
    if (unused > 0)
      credits.push({ key: 'transfer', label: 'Credits transferred from spouse', amount: unused, hint: "Your spouse's unused personal credits" });
    const spouseIncomeTax = Math.max(0, sT.total - spouseEmployee - (transferable - unused));
    const ssc = socialCharges(sp, inputs, cfg, true);
    const spouseUsc = ssc.uscR.total + ssc.surcharge;
    const spousePrsi = ssc.prsiR.total + sum(ssc.prsiOther);
    household = {
      spouseGross: sp.gross,
      spouseBik: sp.bik,
      spousePension: sp.pensionContribution,
      spouseAutoEnrolment: sp.autoEnrolment.employee,
      spouseIncomeTax,
      spouseUsc,
      spousePrsi,
      spouseNet: sp.gross - spouseIncomeTax - spouseUsc - spousePrsi - sp.pensionContribution - sp.autoEnrolment.employee,
      spouseBand,
      combinedGross: 0,
      combinedNet: 0,
      combinedTax: 0,
    };
  }

  const creditsTotal = sum(credits);
  let incomeTax = Math.max(0, t.total - creditsTotal);

  // Age exemption (65+) with marginal relief
  let ageExemptionApplied = false;
  if (anyone65) {
    const limit = married ? cfg.ageExemption.married : cfg.ageExemption.single;
    const income = you.taxable + (sp ? sp.taxable : 0);
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

  // --- USC & PRSI -----------------------------------------------------------
  const sc = socialCharges(you, inputs, cfg, false);
  const usc = sc.uscR.total + sc.surcharge;
  const prsi = sc.prsiR.total + sum(sc.prsiOther);
  const totalTax = incomeTax + usc + prsi;

  // RSU tax: the extra tax the RSUs cause (paid by selling shares when sell-to-cover is on)
  let rsuTax = 0;
  if (you.rsu > 0 && !opts.noRsuSplit) {
    const without = calculateForBase({ ...inputs, shares: { ...inputs.shares, rsu: 0 } }, baseSalary, { extra: opts.extra, noRsuSplit: true });
    rsuTax = Math.max(0, totalTax - without.totalTax);
  }
  const sellToCover = inputs.shares.rsuSellToCover && you.rsu > 0;

  const otherIncomeTotal = sum(you.otherIncome);
  const totalDeductions =
    totalTax + you.sacrifice + you.pensionContribution + you.autoEnrolment.employee + you.asc + you.esppContribution - (sellToCover ? rsuTax : 0);
  const net = you.gross + otherIncomeTotal - totalDeductions;
  const totalIncome = you.gross + you.bik + you.shareIncome + you.apss + otherIncomeTotal;

  if (household) {
    household.combinedGross = you.gross + otherIncomeTotal + household.spouseGross;
    household.combinedNet = net + household.spouseNet;
    household.combinedTax = totalTax + household.spouseIncomeTax + household.spouseUsc + household.spousePrsi;
  }

  const payslipRate = inputs.payslipMode
    ? (() => {
        const p = cfg.prsi.periods[currentPeriodIndex(cfg.year)];
        return { from: p.from, rate: p.rate };
      })()
    : undefined;

  return {
    year: inputs.year,
    config: cfg,
    baseSalary: base,
    overtime: you.overtime,
    bonus: you.bonus,
    bonusToPension: you.bonusToPension,
    gross: you.gross,
    taxSaver: you.sacrifice,
    bik: you.bik,
    bikLines: you.bikLines,
    shares: {
      esppContribution: you.esppContribution,
      esppBenefit: you.esppBenefit,
      esppSharesValue: you.esppContribution + you.esppBenefit,
      apss: you.apss,
      apssTaxFree: you.apss - you.apssTaxable,
      rsu: you.rsu,
      rsuTax,
      sellToCover,
    },
    otherIncome: you.otherIncome,
    otherIncomeTotal,
    totalIncome,
    pensionMain: you.pensionMain,
    avc: you.avc,
    pensionContribution: you.pensionContribution,
    pensionRequested: you.pensionRequested,
    pensionRelieved: you.pensionRelieved,
    pensionLimit: you.pensionLimit,
    pensionLimitPct: you.limitPct,
    asc: you.asc,
    deductions: you.deductions,
    taxableIncome: you.taxable,
    band,
    taxAtStandard: t.atStd,
    taxAtHigher: t.atHigh,
    grossTax: t.total,
    credits,
    creditsTotal,
    creditsUsed,
    ageExemptionApplied,
    incomeTax,
    usc,
    uscLines: sc.uscR.lines,
    uscSurcharge: sc.surcharge,
    uscExempt: sc.uscR.exempt,
    uscReduced: sc.uscR.reduced,
    prsi,
    prsiLines: sc.prsiR.lines,
    prsiOther: sc.prsiOther,
    prsiExempt: sc.prsiR.exempt,
    prsiCredit: sc.prsiR.credit,
    prsiClass: sc.classD ? 'D' : 'A',
    payslipRate,
    autoEnrolment: you.autoEnrolment,
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
  const netAt = (b: number) => calculateForBase(inputs, b).net;
  let lo = 0;
  let hi = Math.max(1000, targetNetAnnual * 4);
  while (netAt(hi) < targetNetAnnual && hi < 1e9) hi *= 2;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (netAt(mid) < targetNetAnnual) lo = mid;
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
  const r2 = calculateForBase(inputs, baseSalary, { extra: MARGINAL_STEP, noRsuSplit: true });
  const dGross = r2.totalIncome - r.totalIncome;
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
