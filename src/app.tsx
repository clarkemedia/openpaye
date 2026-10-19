import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { calculate, DEFAULT_INPUTS, type Inputs, type Period } from './tax/engine';
import { YEAR_LIST, YEARS, type TaxYear } from './tax/years';
import { applyTheme, SEEDS, type SeedId, type ThemeMode } from './lib/theme';
import { decodeInputs, encodeInputs, loadPref, savePref, shareUrl } from './lib/state';
import { eurWhole } from './lib/format';
import { Button, ButtonGroup, Icon, IconButton, Snackbar } from './components/ui';
import { Brand, DonateButton, SiteFooter } from './components/site';
import { ExploreChips, SupportCard } from './components/support';
import { OptionsPanel, SalaryCard } from './components/options';
import { Breakdown, Hero, PeriodTable } from './components/results';
import { AutoEnrolmentCard, BudgetCompare, CurveCard, HouseholdCard, MissingCredits, NextHundred, TaxFreedom, VsMedian, WhatIf } from './components/insights';

/** Embedded in another page (e.g. an iframe), where printing and page links don't apply */
const FRAMED = (() => {
  if (typeof window === 'undefined') return false;
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();

/** The offline single-file build has no other pages to link to */
const STANDALONE = import.meta.env.MODE === 'single';

const initialInputs = (): Inputs =>
  (typeof location !== 'undefined' && decodeInputs(location.hash)) || loadPref<Inputs>('inputs', DEFAULT_INPUTS);

export function App() {
  const [inputs, setInputs] = useState<Inputs>(() => ({ ...DEFAULT_INPUTS, ...initialInputs() }));
  const [display, setDisplay] = useState<Period>(() => loadPref<Period>('display', 'month'));
  const [mode, setMode] = useState<ThemeMode>(() => loadPref<ThemeMode>('mode', 'system'));
  const [seed, setSeed] = useState<SeedId>(() => loadPref<SeedId>('seed', 'shamrock'));
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [snack, setSnack] = useState<string | null>(null);
  const snackTimer = useRef<number>();

  const set = (patch: Partial<Inputs>) => setInputs((prev) => ({ ...prev, ...patch }));
  const r = useMemo(() => calculate(inputs), [inputs]);

  useEffect(() => applyTheme(seed, mode), [seed, mode]);
  useEffect(() => savePref('display', display), [display]);
  useEffect(() => {
    savePref('mode', mode);
    savePref('seed', seed);
  }, [mode, seed]);

  // Persist + keep the URL shareable
  useEffect(() => {
    const t = setTimeout(() => {
      savePref('inputs', inputs);
      const code = encodeInputs(inputs);
      history.replaceState(null, '', code ? `#c=${code}` : location.pathname + location.search);
    }, 250);
    return () => clearTimeout(t);
  }, [inputs]);

  useEffect(() => {
    document.title = `${eurWhole(r.net / 12)}/month take-home on ${eurWhole(r.gross)} · OpenPAYE`;
  }, [r.net, r.gross]);

  const toast = (m: string) => {
    setSnack(m);
    clearTimeout(snackTimer.current);
    snackTimer.current = window.setTimeout(() => setSnack(null), 2600);
  };

  const share = async () => {
    const url = shareUrl(inputs);
    const text = `${eurWhole(r.gross)} gross is ${eurWhole(r.net / 12)} a month take-home in ${inputs.year}.`;
    try {
      if (navigator.share && matchMedia('(pointer: coarse)').matches) {
        await navigator.share({ title: 'OpenPAYE', text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast('Link copied — it opens this exact calculation');
    } catch {
      toast('Copy this page address to share');
    }
  };

  const nextMode: Record<ThemeMode, ThemeMode> = { system: 'light', light: 'dark', dark: 'system' };
  const modeIcon = { system: 'brightness_auto', light: 'light_mode', dark: 'dark_mode' } as const;
  const modeLabel = { system: 'Theme: follows your device', light: 'Theme: light', dark: 'Theme: dark' };

  const cfg = YEARS[inputs.year];

  return (
    <>
      <header class="topbar">
        <Brand />
        <ButtonGroup
          label="Tax year"
          class="year-group"
          value={inputs.year}
          onChange={(year: TaxYear) => set({ year })}
          options={YEAR_LIST.map((y) => ({
            value: y,
            label: String(y),
            title: YEARS[y].note,
          }))}
        />
        <div class="topbar-actions">
          <div class="palette-wrap">
            <IconButton icon="palette" label="Colour" onClick={() => setPaletteOpen(!paletteOpen)} selected={paletteOpen} />
            {paletteOpen && (
              <div class="palette-pop" role="menu" onMouseLeave={() => setPaletteOpen(false)}>
                {SEEDS.map((s) => (
                  <button
                    type="button"
                    role="menuitemradio"
                    aria-checked={seed === s.id}
                    class={`swatch ${seed === s.id ? 'on' : ''}`}
                    style={{ '--sw': s.hex } as any}
                    onClick={() => {
                      setSeed(s.id);
                      setPaletteOpen(false);
                    }}
                    title={s.name}
                  >
                    {seed === s.id && <Icon name="check" size={18} />}
                    <span class="swatch-name">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <IconButton icon={modeIcon[mode]} label={modeLabel[mode]} onClick={() => setMode(nextMode[mode])} />
          {!FRAMED && <IconButton icon="share" label="Share this calculation" onClick={share} class="hide-sm" />}
          {!FRAMED && <DonateButton />}
        </div>
      </header>

      <main class="layout">
        <div class="intro">
          <h1>
            What you <em>actually</em> take home.
          </h1>
          <p>
            Ireland's salary after tax calculator — Income Tax, USC and PRSI for {YEAR_LIST.join(', ')}, including Budget 2027. Free, private, and
            open source. Nothing you type leaves your device.
          </p>
          {!STANDALONE && <ExploreChips />}
        </div>

        {cfg.status === 'announced' && (
          <div class="banner" role="note">
            <Icon name="info" size={20} />
            <span>
              <b>Budget 2027 rates</b> were announced on 6 October 2026 and apply from 1 January 2027, once the Finance Act is passed.
            </span>
          </div>
        )}

        <div class="calc">
          <div class="calc-salary">
            <SalaryCard inputs={inputs} set={set} />
          </div>
          <div class="calc-results">
            <Hero r={r} inputs={inputs} display={display} setDisplay={setDisplay} />
            <PeriodTable r={r} inputs={inputs} />
          </div>
          <div class="calc-inputs">
            <OptionsPanel inputs={inputs} set={set} />
            <div class="input-actions">
              <Button variant="text" icon="restart_alt" onClick={() => setInputs({ ...DEFAULT_INPUTS, year: inputs.year })}>
                Start over
              </Button>
              {!FRAMED && (
                <>
                  <Button variant="tonal" icon="share" onClick={share}>
                    Share
                  </Button>
                  <Button variant="text" icon="print" onClick={() => window.print()}>
                    Print
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <h2 class="section-title">
          <Icon name="monitoring" size={28} /> Insights
        </h2>
        <div class="insights">
          <BudgetCompare inputs={inputs} r={r} />
          <NextHundred r={r} />
          <TaxFreedom r={r} inputs={inputs} />
          <CurveCard r={r} inputs={inputs} />
          <VsMedian r={r} inputs={inputs} />
          <WhatIf r={r} inputs={inputs} />
          {r.household && <HouseholdCard r={r} />}
          <AutoEnrolmentCard r={r} />
          <MissingCredits r={r} inputs={inputs} />
          <RatesCard year={inputs.year} />
        </div>

        <Breakdown r={r} />

        {!FRAMED && <SupportCard />}

        <About />
      </main>

      {!STANDALONE && <SiteFooter />}
      <Snackbar message={snack} />
    </>
  );
}

function RatesCard({ year }: { year: TaxYear }) {
  const c = YEARS[year];
  const b = c.incomeTax.bands;
  return (
    <section class="card insight" aria-labelledby="rc-h">
      <h2 id="rc-h" class="card-title">
        <Icon name="receipt_long" /> {year} at a glance
      </h2>
      <dl class="glance">
        <dt>20% band (single)</dt>
        <dd>{eurWhole(b.single)}</dd>
        <dt>Personal + PAYE credits</dt>
        <dd>{eurWhole(c.credits.personalSingle + c.credits.employee)}</dd>
        <dt>USC</dt>
        <dd>{c.usc.bands.map((x) => `${(x.rate * 100).toFixed(1).replace('.0', '')}%`).join(' · ')}</dd>
        <dt>USC 2% band ends</dt>
        <dd>{eurWhole(c.usc.bands[1].upTo)}</dd>
        <dt>PRSI</dt>
        <dd>{c.prsi.periods.map((p) => `${(p.rate * 100).toFixed(2).replace(/0$/, '')}% from ${p.from}`).join(', ')}</dd>
        <dt>Rent Tax Credit</dt>
        <dd>{eurWhole(c.credits.rentSingle)}</dd>
        <dt>Minimum wage</dt>
        <dd>€{c.context.minimumWageHourly.toFixed(2)}/hr</dd>
      </dl>
    </section>
  );
}

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'What taxes come out of my pay in Ireland?',
    a: 'Three: Income Tax (20% up to your standard rate cut-off, 40% above it, reduced by your tax credits), the Universal Social Charge (USC, from 0.5% to 8%), and PRSI (social insurance, about 4.2–4.5%). Pension contributions and auto-enrolment also come out of your gross pay, but they are your savings, not tax.',
  },
  {
    q: 'What changed in Budget 2027?',
    a: 'From 1 January 2027 the standard rate cut-off rises by €2,500 (to €46,500 for a single person), the personal, employee and earned income credits rise by €125 to €2,125, the USC 2% band widens to €30,300, and the Rent Tax Credit increases to €1,150. Mortgage Interest Relief is not extended beyond 2026.',
  },
  {
    q: 'Why does PRSI change part-way through the year?',
    a: 'Under the Social Welfare Act, the employee PRSI rate rises every 1 October: 4.1% → 4.2% (Oct 2025), 4.35% (Oct 2026), 4.5% (Oct 2027). We apply each rate to the share of the year it is in force.',
  },
  {
    q: 'How accurate is this?',
    a: 'It applies the published rates, bands and credits the same way Revenue does on an annual basis, and every step is shown in "Show me the maths". Your real payslip may differ slightly if your tax credit certificate includes other credits, if you started mid-year, or if you are on emergency tax.',
  },
  {
    q: 'Is my data stored anywhere?',
    a: 'No. All calculations run in your browser. Your inputs are saved only on your device and in the page address, so you can bookmark or share a calculation.',
  },
  {
    q: 'Can I host this myself?',
    a: 'Yes. OpenPAYE is open source and builds to a handful of static files — no server, database or tracking. Run it with Docker, any static web host, or open the single-file build directly.',
  },
];

function About() {
  return (
    <section class="about" aria-labelledby="faq-h">
      <h2 id="faq-h" class="section-title">
        <Icon name="help" size={28} /> Questions people ask
      </h2>
      <div class="faq">
        {FAQ.map((f) => (
          <details class="faq-item">
            <summary>
              {f.q}
              <Icon name="keyboard_arrow_down" class="faq-chevron" />
            </summary>
            <p>{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
