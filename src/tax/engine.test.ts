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
    const r = run({ year: 2026, amount: 70000, family: 'marriedTwo', spouse: { ...DEFAULT_INPUTS.spouse, salary: 30000 } });
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

  it('relief is capped at the age % of earnings up to €115,000', () => {
    const r = run({ amount: 150000, age: 30, pension: { type: 'percent', value: 20, per: 'year' } });
    expect(r.pensionContribution).toBe(30000);
    expect(r.pensionLimit).toBe(23000);
    expect(r.pensionRelieved).toBe(23000);
  });

  it('capToRelief limits the contribution itself to the relief maximum', () => {
    const r = run({ amount: 150000, age: 30, pension: { type: 'percent', value: 20, per: 'year', capToRelief: true } });
    expect(r.pensionRequested).toBe(30000);
    expect(r.pensionContribution).toBe(23000);
    expect(r.pensionRelieved).toBe(23000);
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

describe('cross-check against PwC Ireland Budget 2027 calculator', () => {
  // PwC results for a single employee on €40,000, full-rate PRSI, no pension
  it('€40,000 single, 2026 and 2027, matches to the euro', () => {
    const r26 = run({ year: 2026, amount: 40000 });
    expect(r26.incomeTax).toBeCloseTo(4000, 0);
    expect(r26.prsi).toBeCloseTo(1695, 0);
    expect(r26.usc).toBeCloseTo(733, 0);
    expect(r26.net).toBeCloseTo(33572, 0);
    const r27 = run({ year: 2027, amount: 40000 });
    expect(r27.incomeTax).toBeCloseTo(3750, 0);
    expect(r27.prsi).toBeCloseTo(1755, 0);
    expect(r27.usc).toBeCloseTo(717, 0);
    expect(r27.net).toBeCloseTo(33778, 0);
  });
});

/* ------------------------------------------------------------------ */
/* v1.1 features, worked by hand                                       */
/* ------------------------------------------------------------------ */

const base60 = () => run({ year: 2026, amount: 60000, age: 35 });

describe('v1.1: pension and AVC', () => {
  it('AVC shares the relief limit with the main pension', () => {
    const r = run({ year: 2026, amount: 60000, age: 35, pension: { type: 'percent', value: 5, per: 'year' }, avc: { type: 'fixed', value: 200, per: 'month' } });
    expect(r.pensionMain).toBe(3000);
    expect(r.avc).toBe(2400);
    expect(base60().incomeTax - r.incomeTax).toBeCloseTo(5400 * 0.4, 2);
  });

  it('bonus planner: part of the bonus goes into the pension as an AVC', () => {
    const r = run({ year: 2026, amount: 60000, bonus: { type: 'percent', value: 10, per: 'year' }, bonusPlan: { toPensionPct: 50, separate: false } });
    expect(r.bonus).toBe(6000);
    expect(r.bonusToPension).toBe(3000);
    expect(r.pensionRelieved).toBe(3000);
  });
});

describe('v1.1: full household', () => {
  it("joint assessment uses the spouse's own pension", () => {
    const r = run({
      year: 2026,
      amount: 70000,
      family: 'marriedTwo',
      spouse: { ...DEFAULT_INPUTS.spouse, salary: 30000, pension: { type: 'percent', value: 5, per: 'year' } },
    });
    // Spouse taxable 28,500 → combined band 53,000 + 28,500 = 81,500 on 98,500
    const expected = 81500 * 0.2 + 17000 * 0.4 - (4000 + 2000 + 2000);
    expect(r.incomeTax + r.household!.spouseIncomeTax).toBeCloseTo(expected, 2);
    expect(r.household!.spousePension).toBe(1500);
    expect(r.household!.combinedNet).toBeCloseTo(r.net + r.household!.spouseNet, 6);
  });
});

describe('v1.1: credits and reliefs', () => {
  it('widowed person credit and single band', () => {
    expect(run({ year: 2026, amount: 50000, family: 'widowed' }).incomeTax).toBeCloseTo(11200 - 2540 - 2000, 2);
  });
  it('Blind Person and Dependent Relative credits', () => {
    const r = run({ year: 2026, amount: 50000, blind: { you: true, spouse: false }, dependentRelatives: 2 });
    expect(r.incomeTax).toBeCloseTo(7200 - 1950 - 610, 2);
  });
  it('flat rate expenses reduce income tax at the marginal rate', () => {
    expect(base60().incomeTax - run({ year: 2026, amount: 60000, age: 35, flatRateExpenses: 500 }).incomeTax).toBeCloseTo(200, 2);
  });
  it('remote working relief: 30% of bills for days at home', () => {
    const r = run({ year: 2026, amount: 60000, age: 35, remote: { enabled: true, bills: 3000, days: 146, allowance: 0 } });
    expect(r.deductions.find((d) => d.key === 'remote')!.amount).toBeCloseTo(360, 2);
    expect(base60().incomeTax - r.incomeTax).toBeCloseTo(144, 2);
  });
});

describe('v1.1: company shares', () => {
  it('APSS: no Income Tax up to €12,700, but USC and PRSI apply', () => {
    const b = base60();
    const r = run({ year: 2026, amount: 60000, age: 35, shares: { ...DEFAULT_INPUTS.shares, apss: 10000 } });
    expect(r.incomeTax).toBeCloseTo(b.incomeTax, 2);
    expect(r.usc - b.usc).toBeCloseTo(300, 2);
    expect(r.prsi - b.prsi).toBeCloseTo(10000 * 0.042375, 2);
  });
  it('ESPP: contribution from net pay, discount taxed as pay', () => {
    const b = base60();
    const r = run({ year: 2026, amount: 60000, age: 35, shares: { ...DEFAULT_INPUTS.shares, espp: { type: 'percent', value: 10, per: 'month', discount: 15 } } });
    expect(r.shares.esppContribution).toBe(6000);
    expect(r.shares.esppBenefit).toBeCloseTo((6000 * 0.15) / 0.85, 2);
    expect(r.incomeTax - b.incomeTax).toBeCloseTo(r.shares.esppBenefit * 0.4, 2);
    expect(r.net).toBeCloseTo(b.net - 6000 - (r.totalTax - b.totalTax), 2);
  });
  it('RSUs with sell-to-cover leave cash take-home unchanged', () => {
    const b = base60();
    const r = run({ year: 2026, amount: 60000, age: 35, shares: { ...DEFAULT_INPUTS.shares, rsu: 20000, rsuSellToCover: true } });
    expect(r.shares.rsuTax).toBeCloseTo(r.totalTax - b.totalTax, 2);
    expect(r.net).toBeCloseTo(b.net, 2);
  });
});

describe('v1.1: public sector', () => {
  it('ASC (standard): 10% between €34,500 and €60,000, relieved for income tax only', () => {
    const r = run({ year: 2026, amount: 50000, publicSector: { enabled: true, scheme: 'standard', classD: false } });
    expect(r.asc).toBeCloseTo(1550, 2);
    expect(7200 - r.incomeTax).toBeCloseTo(1550 * 0.4, 2);
    expect(r.usc).toBeCloseTo(1032.82, 2);
  });
  it('ASC (Single Scheme): 3.33% then 3.5% above €60,000', () => {
    const r = run({ year: 2026, amount: 70000, publicSector: { enabled: true, scheme: 'single', classD: false } });
    expect(r.asc).toBeCloseTo(25500 * 0.0333 + 10000 * 0.035, 2);
  });
  it('PRSI Class D (pre-1995): 1.10% then 1.25% on the first €1,443 a week', () => {
    const r = run({ year: 2026, amount: 50000, publicSector: { enabled: true, scheme: 'standard', classD: true } });
    expect(r.prsi).toBeCloseTo(50000 * (0.75 * 0.011 + 0.25 * 0.0125), 2);
  });
});

describe('v1.1: other income', () => {
  it('self-employed only: Earned Income credit and Class S PRSI', () => {
    const r = run({ year: 2026, amount: 0, otherIncome: { ...DEFAULT_INPUTS.otherIncome, selfEmployed: 40000 } });
    expect(r.incomeTax).toBeCloseTo(8000 - 2000 - 2000, 2);
    expect(r.prsi).toBeCloseTo(40000 * 0.042375, 2);
    expect(r.net).toBeCloseTo(33572.18, 2);
  });
  it('PAYE and Earned Income credits together are capped', () => {
    const r = run({ year: 2026, amount: 50000, otherIncome: { ...DEFAULT_INPUTS.otherIncome, selfEmployed: 20000 } });
    expect(r.credits.find((c) => c.key === 'eic')).toBeUndefined();
  });
  it('3% USC surcharge on non-PAYE income over €100,000', () => {
    const r = run({ year: 2026, amount: 0, otherIncome: { ...DEFAULT_INPUTS.otherIncome, selfEmployed: 150000 } });
    expect(r.uscSurcharge).toBeCloseTo(1500, 2);
  });
  it('rental income: Income Tax, USC and PRSI at the marginal rates', () => {
    const b = run({ year: 2026, amount: 50000 });
    const r = run({ year: 2026, amount: 50000, otherIncome: { ...DEFAULT_INPUTS.otherIncome, rental: 10000 } });
    expect(r.net - b.net).toBeCloseTo(10000 - 4000 - 300 - 423.75, 2);
  });
  it('rent-a-room is tax-free up to the limit, fully taxable over it', () => {
    const b = run({ year: 2026, amount: 50000 });
    expect(run({ year: 2026, amount: 50000, otherIncome: { ...DEFAULT_INPUTS.otherIncome, rentARoom: 12000 } }).net - b.net).toBeCloseTo(12000, 2);
    expect(run({ year: 2026, amount: 50000, otherIncome: { ...DEFAULT_INPUTS.otherIncome, rentARoom: 15000 } }).incomeTax).toBeGreaterThan(b.incomeTax);
  });
  it('State pension: taxable, but no USC or PRSI, and the 65+ exemption applies', () => {
    const r = run({ year: 2026, amount: 0, age: 70, otherIncome: { ...DEFAULT_INPUTS.otherIncome, statePension: 15000 } });
    expect(r.incomeTax).toBe(0);
    expect(r.usc).toBe(0);
    expect(r.prsi).toBe(0);
    expect(r.net).toBeCloseTo(15000, 2);
  });
});

describe('v1.1: benefits-in-kind', () => {
  it('company car: (OMV − reduction) × category %', () => {
    const car = { enabled: true, omv: 40000, category: 'C' as const, businessKm: 10000, contribution: 0 };
    expect(run({ year: 2026, car }).bikLines.find((l) => l.key === 'car')!.amount).toBeCloseTo(9000, 2);
    const ev = { ...car, omv: 45000, category: 'A1' as const };
    expect(run({ year: 2026, car: ev }).bik).toBeCloseTo(2250, 2);
    expect(run({ year: 2027, car: ev }).bik).toBeCloseTo(4500, 2);
  });
  it('preferential loan: difference to the 13.5% specified rate', () => {
    expect(run({ year: 2026, loan: { enabled: true, amount: 20000, rate: 2, kind: 'other' } }).bik).toBeCloseTo(2300, 2);
  });
});

describe('v1.1: payslip mode', () => {
  it('uses the PRSI rate in force (for a past year, the October rate)', () => {
    expect(run({ year: 2025, amount: 50000, payslipMode: true }).prsi).toBeCloseTo(50000 * 0.042, 2);
  });
});
