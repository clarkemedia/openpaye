/** Which programmatic pages exist. Change the ranges here to add or remove pages. */

const range = (from: number, to: number, step: number) => {
  const out: number[] = [];
  for (let v = from; v <= to + 1e-9; v += step) out.push(Math.round(v * 100) / 100);
  return out;
};

/** Smaller page set for previews (OPENPAYE_PREVIEW=1): same templates, fewer pages. */
const PREVIEW = !!(globalThis as any).process?.env?.OPENPAYE_PREVIEW;

/** Annual gross salaries: /salary/45000/ */
export const SALARIES = PREVIEW
  ? range(10000, 200000, 5000)
  : [...range(10000, 100000, 500), ...range(101000, 200000, 1000), ...range(210000, 500000, 10000)];

/** Hourly rates: /hourly/15/ (includes each year's minimum wage) */
export const HOURLY = [...new Set([...(PREVIEW ? range(12, 40, 1) : [...range(12, 40, 0.5), ...range(41, 100, 1)]), 14.15, 14.94])].sort((a, b) => a - b);

/** Monthly take-home targets: /take-home/3000-a-month/ */
export const TAKE_HOME = PREVIEW ? range(1500, 8000, 500) : range(1200, 12000, 50);

export const FULL_TIME_HOURS = 39;

export const salaryPath = (n: number) => `/salary/${n}/`;
export const hourlyPath = (n: number) => `/hourly/${String(n).replace('.', '-')}/`;
export const takeHomePath = (n: number) => `/take-home/${n}-a-month/`;

export function nearest(list: number[], v: number) {
  return list.reduce((best, x) => (Math.abs(x - v) < Math.abs(best - v) ? x : best), list[0]);
}

export function neighbours(list: number[], v: number, count = 4) {
  const i = list.indexOf(v);
  return list.slice(Math.max(0, i - count), i).concat(list.slice(i + 1, i + 1 + count));
}
