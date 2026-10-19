/**
 * What an employee costs an employer in Ireland: gross pay plus employer
 * PRSI, auto-enrolment matching and any employer pension contribution.
 */
import { YEARS, type TaxYear } from './years';

export interface EmployerInputs {
  year: TaxYear;
  gross: number;
  /** Employer pension contribution, % of gross (on top of auto-enrolment) */
  employerPensionPct: number;
  autoEnrolment: boolean;
  /** Taxable benefits paid by the employer (e.g. health insurance), per year */
  benefits: number;
}

export interface EmployerResult {
  gross: number;
  weekly: number;
  lowerRateBand: boolean;
  prsi: number;
  prsiLines: { from: string; rate: number; amount: number }[];
  autoEnrolment: number;
  pension: number;
  benefits: number;
  total: number;
  /** Extra cost on top of gross, as a share of gross */
  onCost: number;
}

export function employerCost(i: EmployerInputs): EmployerResult {
  const cfg = YEARS[i.year];
  const gross = Math.max(0, i.gross);
  const benefits = Math.max(0, i.benefits);
  const prsiBase = gross + benefits;
  const weekly = prsiBase / 52;
  const low = weekly <= cfg.employerPrsi.weeklyThreshold;
  const prsiLines = cfg.employerPrsi.periods.map((p) => {
    const rate = low ? p.low : p.high;
    return { from: p.from, rate, amount: prsiBase * p.share * rate };
  });
  const prsi = prsiLines.reduce((a, l) => a + l.amount, 0);
  const ae = cfg.autoEnrolment.available && i.autoEnrolment ? Math.min(gross, cfg.autoEnrolment.earningsCap) * cfg.autoEnrolment.employerRate : 0;
  const pension = (gross * Math.max(0, i.employerPensionPct)) / 100;
  const total = gross + benefits + prsi + ae + pension;
  return {
    gross,
    weekly,
    lowerRateBand: low,
    prsi,
    prsiLines,
    autoEnrolment: ae,
    pension,
    benefits,
    total,
    onCost: gross > 0 ? (total - gross) / gross : 0,
  };
}
