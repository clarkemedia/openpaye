const eur0 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eur2 = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num0 = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 0 });

/** Euro, whole euro for large values, cents for small ones. */
export function eur(n: number, cents?: boolean): string {
  const v = Math.abs(n) < 0.005 ? 0 : n;
  return (cents ?? Math.abs(v) < 1000) ? eur2.format(v) : eur0.format(v);
}

export const eurWhole = (n: number) => eur0.format(Math.abs(n) < 0.5 ? 0 : n);
export const eurCents = (n: number) => eur2.format(Math.abs(n) < 0.005 ? 0 : n);
export const num = (n: number) => num0.format(n);

export function pct(n: number, digits = 1): string {
  return `${(n * 100).toFixed(digits).replace(/\.0+$/, '')}%`;
}

export function signedEur(n: number): string {
  if (Math.abs(n) < 0.5) return '±€0';
  return `${n > 0 ? '+' : '−'}${eurWhole(Math.abs(n))}`;
}

export const PERIOD_LABELS = {
  year: { short: 'Year', per: 'per year', adj: 'Yearly' },
  month: { short: 'Month', per: 'per month', adj: 'Monthly' },
  fortnight: { short: 'Fortnight', per: 'per fortnight', adj: 'Fortnightly' },
  week: { short: 'Week', per: 'per week', adj: 'Weekly' },
  day: { short: 'Day', per: 'per day', adj: 'Daily' },
  hour: { short: 'Hour', per: 'per hour', adj: 'Hourly' },
} as const;
