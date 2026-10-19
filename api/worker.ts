/**
 * OpenPAYE JSON API — deploy as a Cloudflare Worker (see api/README.md).
 *
 *   GET /v1/calculate?salary=45000&year=2027&status=single&period=year
 *   GET /v1/calculate?net=3000&period=month         (net → gross)
 *   GET /v1/employer?salary=45000&year=2026
 */
import { calculate, DEFAULT_INPUTS, type FamilyStatus, type Inputs, type Period } from '../src/tax/engine';
import { employerCost } from '../src/tax/employer';
import { YEAR_LIST, DEFAULT_YEAR, type TaxYear } from '../src/tax/years';

const PERIODS: Period[] = ['year', 'month', 'fortnight', 'week', 'day', 'hour'];
const STATUSES: FamilyStatus[] = ['single', 'singleParent', 'marriedOne', 'marriedTwo'];

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body, null, 2), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'cache-control': 'public, max-age=86400',
    },
  });

const round = (n: number) => Math.round(n * 100) / 100;

export default {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const q = url.searchParams;
    if (req.method === 'OPTIONS') return json({});
    const yearParam = Number(q.get('year') ?? DEFAULT_YEAR) as TaxYear;
    const year = YEAR_LIST.includes(yearParam) ? yearParam : DEFAULT_YEAR;

    if (url.pathname === '/v1/calculate') {
      const period = PERIODS.includes(q.get('period') as Period) ? (q.get('period') as Period) : 'year';
      const status = STATUSES.includes(q.get('status') as FamilyStatus) ? (q.get('status') as FamilyStatus) : 'single';
      const reverse = q.has('net');
      const amount = Number(q.get(reverse ? 'net' : 'salary'));
      if (!(amount > 0)) return json({ error: 'Pass a positive salary= (or net=) amount.' }, 400);
      const inputs: Inputs = {
        ...DEFAULT_INPUTS,
        year,
        amount,
        period,
        reverse,
        family: status,
        spouse: { ...DEFAULT_INPUTS.spouse, salary: Number(q.get('spouseIncome') ?? 0) },
        age: Number(q.get('age') ?? 30),
        pension: { type: 'percent', value: Number(q.get('pension') ?? 0), per: 'year' },
        autoEnrolment: q.get('autoEnrolment') === '1',
      };
      const r = calculate(inputs);
      return json({
        year,
        inputs: { amount, period, reverse, status },
        annual: {
          gross: round(r.gross),
          incomeTax: round(r.incomeTax),
          usc: round(r.usc),
          prsi: round(r.prsi),
          pension: round(r.pensionContribution),
          autoEnrolment: round(r.autoEnrolment.employee),
          net: round(r.net),
        },
        monthly: { gross: round(r.gross / 12), net: round(r.net / 12) },
        weekly: { gross: round(r.gross / 52), net: round(r.net / 52) },
        rates: { effective: round(r.effectiveRate * 100) / 100, marginal: round(r.marginalRate * 100) / 100 },
        source: 'https://github.com/clarkemedia/openpaye',
      });
    }

    if (url.pathname === '/v1/employer') {
      const salary = Number(q.get('salary'));
      if (!(salary > 0)) return json({ error: 'Pass a positive salary= amount.' }, 400);
      const r = employerCost({ year, gross: salary, employerPensionPct: Number(q.get('pension') ?? 0), autoEnrolment: q.get('autoEnrolment') !== '0', benefits: Number(q.get('benefits') ?? 0) });
      return json({ year, salary, employerPrsi: round(r.prsi), autoEnrolment: round(r.autoEnrolment), pension: round(r.pension), total: round(r.total), source: 'https://github.com/clarkemedia/openpaye' });
    }

    return json({ name: 'OpenPAYE API', version: 1, endpoints: ['/v1/calculate', '/v1/employer'], docs: 'https://github.com/clarkemedia/openpaye/tree/main/api' });
  },
};
