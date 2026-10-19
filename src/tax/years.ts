/**
 * Irish PAYE tax parameters by tax year.
 *
 * Every figure here is public. Sources:
 *  - Revenue.ie tax credits, rate bands and reliefs
 *  - Department of Finance Budget 2025, 2026 and 2027 documents
 *  - Department of Social Protection PRSI rates (Class A)
 *
 * Budget 2027 (announced 6 October 2026) takes effect on 1 January 2027
 * once the Finance Act is signed. Treat 2027 figures as "announced".
 */

export type TaxYear = 2025 | 2026 | 2027;

export interface UscBand {
  /** Upper limit of the band, in euro per year. `Infinity` for the top band. */
  upTo: number;
  rate: number;
}

export interface YearConfig {
  year: TaxYear;
  status: 'final' | 'current' | 'announced';
  label: string;
  note: string;

  incomeTax: {
    standardRate: number;
    higherRate: number;
    /** Standard rate cut-off points */
    bands: {
      single: number;
      singleParent: number;
      marriedOneIncome: number;
      /** Max extra band for the second earner in a two-income couple */
      marriedSecondIncomeIncrease: number;
    };
  };

  credits: {
    personalSingle: number;
    personalMarried: number;
    employee: number;
    singlePersonChildCarer: number;
    homeCarer: number;
    homeCarerIncomeLimit: number;
    ageSingle: number;
    ageMarried: number;
    incapacitatedChild: number;
    rentSingle: number;
    rentCouple: number;
    /** null when the relief is not available that year */
    mortgageInterestCap: number | null;
    mortgageInterestRate: number;
  };

  /** Income tax exemption for people aged 65+ */
  ageExemption: { single: number; married: number };

  usc: {
    exemptionThreshold: number;
    bands: UscBand[];
    /** Medical card holders / 70+ with income ≤ this get reduced rates */
    reducedIncomeLimit: number;
    reducedBands: UscBand[];
  };

  prsi: {
    /** Rate periods across the year: share of the year (0-1) and rate */
    periods: { from: string; share: number; rate: number }[];
    weeklyExemption: number;
    creditMax: number;
    creditUpper: number;
  };

  /** Employer Class A PRSI. The rate for a week depends on whether that week's pay is above the threshold. */
  employerPrsi: {
    weeklyThreshold: number;
    periods: { from: string; share: number; low: number; high: number }[];
  };

  pension: {
    earningsCap: number;
    /** Max % of earnings eligible for tax relief by age */
    ageLimits: { minAge: number; pct: number }[];
  };

  autoEnrolment: {
    available: boolean;
    employeeRate: number;
    employerRate: number;
    stateRate: number;
    earningsCap: number;
    minEarnings: number;
  };

  medicalInsurance: { rate: number; adultCap: number; childCap: number };

  context: {
    minimumWageHourly: number;
    /** CSO median annual earnings (latest published, EAADS 2023) */
    medianSalary: number;
    medianSource: string;
    /** CSO mean annual earnings (EAADS 2023) */
    meanSalary: number;
  };
}

const PENSION_AGE_LIMITS = [
  { minAge: 60, pct: 0.4 },
  { minAge: 55, pct: 0.35 },
  { minAge: 50, pct: 0.3 },
  { minAge: 40, pct: 0.25 },
  { minAge: 30, pct: 0.2 },
  { minAge: 0, pct: 0.15 },
];

const MEDIAN = 43221;
const MEDIAN_SOURCE = 'CSO Earnings Analysis using Administrative Data Sources (2023)';
const MEAN = 53995;

const year2025: YearConfig = {
  year: 2025,
  status: 'final',
  label: '2025',
  note: 'Budget 2025 rates. PRSI rose from 4.1% to 4.2% on 1 October 2025.',
  incomeTax: {
    standardRate: 0.2,
    higherRate: 0.4,
    bands: {
      single: 44000,
      singleParent: 48000,
      marriedOneIncome: 53000,
      marriedSecondIncomeIncrease: 35000,
    },
  },
  credits: {
    personalSingle: 2000,
    personalMarried: 4000,
    employee: 2000,
    singlePersonChildCarer: 1900,
    homeCarer: 1950,
    homeCarerIncomeLimit: 7200,
    ageSingle: 245,
    ageMarried: 490,
    incapacitatedChild: 3800,
    rentSingle: 1000,
    rentCouple: 2000,
    mortgageInterestCap: 1250,
    mortgageInterestRate: 0.2,
  },
  ageExemption: { single: 18000, married: 36000 },
  usc: {
    exemptionThreshold: 13000,
    bands: [
      { upTo: 12012, rate: 0.005 },
      { upTo: 27382, rate: 0.02 },
      { upTo: 70044, rate: 0.03 },
      { upTo: Infinity, rate: 0.08 },
    ],
    reducedIncomeLimit: 60000,
    reducedBands: [
      { upTo: 12012, rate: 0.005 },
      { upTo: Infinity, rate: 0.02 },
    ],
  },
  prsi: {
    periods: [
      { from: '1 Jan', share: 0.75, rate: 0.041 },
      { from: '1 Oct', share: 0.25, rate: 0.042 },
    ],
    weeklyExemption: 352,
    creditMax: 12,
    creditUpper: 424,
  },
  employerPrsi: {
    weeklyThreshold: 527,
    periods: [
      { from: '1 Jan', share: 0.75, low: 0.089, high: 0.1115 },
      { from: '1 Oct', share: 0.25, low: 0.09, high: 0.1125 },
    ],
  },
  pension: { earningsCap: 115000, ageLimits: PENSION_AGE_LIMITS },
  autoEnrolment: {
    available: false,
    employeeRate: 0,
    employerRate: 0,
    stateRate: 0,
    earningsCap: 80000,
    minEarnings: 20000,
  },
  medicalInsurance: { rate: 0.2, adultCap: 1000, childCap: 500 },
  context: {
    minimumWageHourly: 13.5,
    medianSalary: MEDIAN,
    medianSource: MEDIAN_SOURCE,
    meanSalary: MEAN,
  },
};

const year2026: YearConfig = {
  ...year2025,
  year: 2026,
  status: 'current',
  label: '2026',
  note:
    'Budget 2026 rates. USC 2% band widened to €28,700. PRSI rises from 4.2% to 4.35% on 1 October 2026. Auto-enrolment (My Future Fund) started 1 January 2026.',
  usc: {
    ...year2025.usc,
    bands: [
      { upTo: 12012, rate: 0.005 },
      { upTo: 28700, rate: 0.02 },
      { upTo: 70044, rate: 0.03 },
      { upTo: Infinity, rate: 0.08 },
    ],
  },
  prsi: {
    ...year2025.prsi,
    periods: [
      { from: '1 Jan', share: 0.75, rate: 0.042 },
      { from: '1 Oct', share: 0.25, rate: 0.0435 },
    ],
  },
  employerPrsi: {
    weeklyThreshold: 552,
    periods: [
      { from: '1 Jan', share: 0.75, low: 0.09, high: 0.1125 },
      { from: '1 Oct', share: 0.25, low: 0.0915, high: 0.114 },
    ],
  },
  autoEnrolment: {
    available: true,
    employeeRate: 0.015,
    employerRate: 0.015,
    stateRate: 0.005,
    earningsCap: 80000,
    minEarnings: 20000,
  },
  context: { ...year2025.context, minimumWageHourly: 14.15 },
};

const year2027: YearConfig = {
  ...year2026,
  year: 2027,
  status: 'announced',
  label: '2027',
  note:
    'Budget 2027 (announced 6 October 2026, effective 1 January 2027 subject to the Finance Act). Standard rate band +€2,500, main credits +€125, USC 2% band to €30,300, Rent Tax Credit to €1,150. Mortgage Interest Relief has ended. PRSI rises to 4.5% on 1 October 2027.',
  incomeTax: {
    ...year2026.incomeTax,
    bands: {
      single: 46500,
      singleParent: 50500,
      marriedOneIncome: 55500,
      marriedSecondIncomeIncrease: 37500,
    },
  },
  credits: {
    ...year2026.credits,
    personalSingle: 2125,
    personalMarried: 4250,
    employee: 2125,
    homeCarer: 2050,
    rentSingle: 1150,
    rentCouple: 2300,
    mortgageInterestCap: null,
  },
  usc: {
    ...year2026.usc,
    bands: [
      { upTo: 12012, rate: 0.005 },
      { upTo: 30300, rate: 0.02 },
      { upTo: 70044, rate: 0.03 },
      { upTo: Infinity, rate: 0.08 },
    ],
  },
  prsi: {
    ...year2026.prsi,
    periods: [
      { from: '1 Jan', share: 0.75, rate: 0.0435 },
      { from: '1 Oct', share: 0.25, rate: 0.045 },
    ],
  },
  employerPrsi: {
    weeklyThreshold: 600,
    periods: [
      { from: '1 Jan', share: 0.75, low: 0.0915, high: 0.114 },
      { from: '1 Oct', share: 0.25, low: 0.093, high: 0.1155 },
    ],
  },
  context: { ...year2026.context, minimumWageHourly: 14.94 },
};

export const YEARS: Record<TaxYear, YearConfig> = {
  2025: year2025,
  2026: year2026,
  2027: year2027,
};

export const YEAR_LIST: TaxYear[] = [2025, 2026, 2027];
export const DEFAULT_YEAR: TaxYear = 2026;
