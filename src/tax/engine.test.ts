import { describe, expect, it } from 'vitest';
import { calculate, DEFAULT_INPUTS, type Inputs } from './engine';

const run = (patch: Partial<Inputs>) => calculate({ ...DEFAULT_INPUTS, ...patch });

describe('single PAYE employee', () => {
  it('€50,000 in 2026 (worked by hand)', () => {
    const r = run({ year: 2026, amount: 50000 });
    // 44,000 @ 20% + 6,000 @ 40% − (2,000 + 2,000)
    expect(r.incomeTax).toBeCloseTo(7200, 2);
    // 12,012 @ 0.5% + 16,688 @ 2% + 21,300 @ 3%
    expect(r.usc).toBeCloseTo(1032.82, 2);
    // 9 months @ 4.2% + 3 months @ 4.35%
    expect(r.prsi).toBeCloseTo(2118.75, 2);
    expect(r.net).toBeCloseTo(39648.43, 2);
  });

  it('€50,000 in 2027 (Budget 2027)', () => {
    const r = run({ year: 2027, amount: 50000 });
    expect(r.incomeTax).toBeCloseTo(6450, 2);
    expect(r.usc).toBeCloseTo(1016.82, 2);
    expect(r.prsi).toBeCloseTo(2193.75, 2);
    expect(r.net).toBeCloseTo(40339.43, 2);
  });

  it('€50,000 in 2025', () => {
    const r = run({ year: 2025, amount: 50000 });
    expect(r.incomeTax).toBeCloseTo(7200, 2);
    // 12,012 @ 0.5% + 15,370 @ 2% + 22,618 @ 3%
    expect(r.usc).toBeCloseTo(60.06 + 307.4 + 678.54, 2);
    expect(r.prsi).toBeCloseTo(50000 * (0.75 * 0.041 + 0.25 * 0.042), 2);
  });

  it('USC exempt at or below €13,000', () => {
    const r = run({ amount: 13000 });
    expect(r.usc).toBe(0);
    expect(r.uscExempt).toBe(true);
  });

  it('PRSI exempt at €352/week or less, tapered credit just above', () => {
    expect(run({ amount: 352 * 52 }).prsi).toBe(0);
    const r = run({ amount: 400 * 52 });
    // weekly charge 400 × rate, credit 12 − 48/6 = 4
    const expected = (400 * 0.042 - 4) * 39 + (400 * 0.0435 - 4) * 13;
    expect(r.prsi).toBeCloseTo(expected, 2);
  });

  it('top marginal rate is 52% income tax + USC + PRSI', () => {
    const r = run({ year: 2026, amount: 120000 });
    expect(r.marginalRate).toBeCloseTo(0.4 + 0.08 + 0.042375, 3);
  });

  it('monthly input equals annual input ×12', () => {
    const a = run({ amount: 4000, period: 'month' });
    const b = run({ amount: 48000, period: 'year' });
    expect(a.net).toBeCloseTo(b.net, 6);
  });
});

describe('reverse (net → gross)', () => {
  it('round-trips', () => {
    const r = run({ amount: 39648.43, reverse: true });
    expect(r.gross).toBeCloseTo(50000, 0);
  });
});

describe('family status', () => {
  it('married one income gets €53,000 band and €4,000 personal credit', () => {
    const r = run({ year: 2026, amount: 60000, family: 'marriedOne' });
    // 53,000 @ 20% + 7,000 @ 40% − (4,000 + 2,000)
    expect(r.incomeTax).toBeCloseTo(10600 + 2800 - 6000, 2);
  });

  it('single parent gets €48,000 band and SPCC credit', () => {
    const r = run({ year: 2026, amount: 50000, family: 'singleParent' });
    // 48,000 @ 20% + 2,000 @ 40% − (2,000 + 2,000 + 1,900)
    expect(r.incomeTax).toBeCloseTo(9600 + 800 - 5900, 2);
  });

  it('two-income couple: combined band = 53,000 + min(lower, 35,000)', () => {
    const r = run({ year: 2026, amount: 70000, family: 'marriedTwo', spouseIncome: 30000 });
    const h = r.household!;
    // Household income tax with combined band 83,000 on 100,000
    const householdGross = 83000 * 0.2 + 17000 * 0.4 - (4000 + 2000 + 2000);
    expect(r.incomeTax + h.spouseIncomeTax).toBeCloseTo(householdGross, 2);
  });
});

describe('reliefs', () => {
  it('pension contributions reduce income tax but not USC/PRSI', () => {
    const a = run({ amount: 60000 });
    const b = run({ amount: 60000, pension: { type: 'percent', value: 5, per: 'year' } });
    expect(b.usc).toBeCloseTo(a.usc, 6);
    expect(b.prsi).toBeCloseTo(a.prsi, 6);
    expect(a.incomeTax - b.incomeTax).toBeCloseTo(3000 * 0.4, 2);
  });

  it('pension relief capped by age band', () => {
    const r = run({ amount: 50000, age: 25, pension: { type: 'percent', value: 30, per: 'year' } });
    expect(r.pensionRelieved).toBeCloseTo(7500, 2);
  });

  it('rent credit is 20% of rent capped', () => {
    const r = run({ year: 2027, amount: 50000, rent: { enabled: true, monthly: 1500 } });
    expect(r.credits.find((c) => c.key === 'rent')!.amount).toBe(1150);
  });

  it('mortgage interest relief only in 2025/2026', () => {
    const m = { enabled: true, interest: 12000, interest2022: 4000 };
    expect(run({ year: 2026, mortgage: m }).credits.find((c) => c.key === 'mortgage')!.amount).toBe(1250);
    expect(run({ year: 2027, mortgage: m }).credits.find((c) => c.key === 'mortgage')).toBeUndefined();
  });

  it('auto-enrolment deducts 1.5% from 2026, nothing in 2025', () => {
    expect(run({ year: 2026, amount: 50000, autoEnrolment: true }).autoEnrolment.employee).toBe(750);
    expect(run({ year: 2025, amount: 50000, autoEnrolment: true }).autoEnrolment.employee).toBe(0);
  });

  it('70+ gets reduced USC and 66+ pays no PRSI', () => {
    const r = run({ amount: 40000, age: 70 });
    expect(r.uscReduced).toBe(true);
    expect(r.prsi).toBe(0);
    expect(r.usc).toBeCloseTo(60.06 + (40000 - 12012) * 0.02, 2);
  });

  it('65+ exemption: no income tax at €18,000', () => {
    expect(run({ amount: 18000, age: 66 }).incomeTax).toBe(0);
  });
});
