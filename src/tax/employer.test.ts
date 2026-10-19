import { describe, expect, it } from 'vitest';
import { employerCost } from './employer';

const base = { employerPensionPct: 0, autoEnrolment: false, benefits: 0 };

describe('employer cost', () => {
  it('€50,000 in 2026 uses the higher rate, split at 1 October', () => {
    const r = employerCost({ ...base, year: 2026, gross: 50000 });
    expect(r.lowerRateBand).toBe(false);
    expect(r.prsi).toBeCloseTo(50000 * (0.75 * 0.1125 + 0.25 * 0.114), 2);
  });

  it('€27,000 in 2026 (≈€519/week) uses the lower rate', () => {
    const r = employerCost({ ...base, year: 2026, gross: 27000 });
    expect(r.lowerRateBand).toBe(true);
    expect(r.prsi).toBeCloseTo(27000 * (0.75 * 0.09 + 0.25 * 0.0915), 2);
  });

  it('2027 threshold of €600/week keeps €30,000 on the lower rate', () => {
    expect(employerCost({ ...base, year: 2027, gross: 30000 }).lowerRateBand).toBe(true);
    expect(employerCost({ ...base, year: 2026, gross: 30000 }).lowerRateBand).toBe(false);
  });

  it('adds auto-enrolment match from 2026 only, capped at €80,000', () => {
    expect(employerCost({ ...base, year: 2026, gross: 100000, autoEnrolment: true }).autoEnrolment).toBe(1200);
    expect(employerCost({ ...base, year: 2025, gross: 100000, autoEnrolment: true }).autoEnrolment).toBe(0);
  });
});
