import { useEffect, useMemo, useState } from 'preact/hooks';
import { calculate, DEFAULT_INPUTS, fromAnnual, type FamilyStatus, type Inputs, type Period } from '../tax/engine';
import { YEAR_LIST, type TaxYear } from '../tax/years';
import { applyTheme, SEEDS, type SeedId, type ThemeMode } from '../lib/theme';
import { encodeInputs } from '../lib/state';
import { eur, pct } from '../lib/format';
import { ButtonGroup, NumberField, SelectField, useAnimatedNumber } from '../components/ui';
import { SplitBar } from '../components/charts';
import { segmentsFor } from '../components/results';

/**
 * Compact calculator for iframes. Query parameters:
 *   salary, period (year|month|week|hour), year, status (single|singleParent|marriedOne|marriedTwo),
 *   show (month|year|week), theme (auto|light|dark), seed (shamrock|atlantic|heather|amber|fuchsia),
 *   attribution (1|0 — set 0 to hide the "Full breakdown" link)
 */
const q = new URLSearchParams(location.search);
const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
  const v = q.get(key) as T | null;
  return v && allowed.includes(v) ? v : fallback;
};

export function Embed() {
  const [inputs, setInputs] = useState<Inputs>(() => ({
    ...DEFAULT_INPUTS,
    amount: Number(q.get('salary')) > 0 ? Number(q.get('salary')) : DEFAULT_INPUTS.amount,
    period: pick<Period>('period', ['year', 'month', 'week', 'hour'], 'year'),
    year: Number(pick('year', YEAR_LIST.map(String), String(DEFAULT_INPUTS.year))) as TaxYear,
    family: pick<FamilyStatus>('status', ['single', 'singleParent', 'marriedOne', 'marriedTwo'], 'single'),
  }));
  const show = pick<Period>('show', ['month', 'year', 'week', 'fortnight'], 'month');
  const attribution = q.get('attribution') !== '0';
  const set = (p: Partial<Inputs>) => setInputs((x) => ({ ...x, ...p }));
  const r = useMemo(() => calculate(inputs), [inputs]);
  const net = useAnimatedNumber(fromAnnual(r.net, show, inputs.schedule));

  useEffect(() => {
    const mode = pick<ThemeMode | 'auto'>('theme', ['auto', 'light', 'dark'], 'auto');
    applyTheme(pick<SeedId>('seed', SEEDS.map((s) => s.id), 'shamrock'), mode === 'auto' ? 'system' : mode);
  }, []);

  // Tell the host page our height so it can size the iframe
  useEffect(() => {
    const post = () => parent.postMessage({ type: 'openpaye:resize', height: document.documentElement.scrollHeight }, '*');
    const ro = new ResizeObserver(post);
    ro.observe(document.body);
    post();
    return () => ro.disconnect();
  }, []);

  const code = encodeInputs({ ...inputs });
  // The calculator lives next to embed.html on whichever server hosts it
  const fullLink = new URL(`./${code ? `#c=${code}` : ''}`, location.href).href;

  return (
    <div class="embed">
      <div class="embed-inputs">
        <NumberField
          label={`Salary ${inputs.period === 'year' ? 'per year' : `per ${inputs.period}`}`}
          prefix="€"
          value={inputs.amount}
          step={inputs.period === 'year' ? 1000 : 50}
          onChange={(amount) => set({ amount })}
        />
        <div class="row">
          <SelectField
            label="Tax status"
            value={inputs.family}
            onChange={(family) => set({ family })}
            options={[
              { value: 'single', label: 'Single' },
              { value: 'singleParent', label: 'Single parent' },
              { value: 'marriedOne', label: 'Married, one income' },
              { value: 'marriedTwo', label: 'Married, two incomes' },
            ]}
          />
          <SelectField
            label="Pay period"
            value={inputs.period}
            onChange={(period) => set({ period })}
            options={(['year', 'month', 'week', 'hour'] as Period[]).map((p) => ({ value: p, label: `Per ${p}` }))}
          />
        </div>
        <ButtonGroup label="Tax year" size="sm" stretch value={inputs.year} onChange={(year) => set({ year })} options={YEAR_LIST.map((y) => ({ value: y, label: String(y) }))} />
      </div>
      <div class="embed-result" aria-live="polite">
        <span class="embed-kicker">Take-home pay · {inputs.year}</span>
        <span class="embed-net">
          {eur(net, true)}
          <small> per {show}</small>
        </span>
        <span class="embed-sub">
          {eur(r.gross)} gross · effective tax {pct(r.effectiveRate)}
        </span>
        <SplitBar segments={segmentsFor(r)} total={r.gross} height={16} format={(n) => eur(fromAnnual(n, show, inputs.schedule))} />
      </div>
      {attribution && (
        <a class="embed-credit" href={fullLink} target="_blank" rel="noopener">
          Full breakdown on <b>OpenPAYE</b> ↗
        </a>
      )}
    </div>
  );
}
