import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { eurWhole, pct } from '../lib/format';

/* ------------------------------------------------------------------ */
/* Split bar — where each euro goes                                   */
/* ------------------------------------------------------------------ */

export interface Segment {
  key: string;
  label: string;
  value: number;
  /** CSS colour token, e.g. var(--viz-net) */
  color: string;
}

export function SplitBar(props: { segments: Segment[]; total: number; format?: (n: number) => string; height?: number; legend?: boolean }) {
  const fmt = props.format ?? eurWhole;
  const segs = props.segments.filter((s) => s.value > 0.005);
  const [hover, setHover] = useState<string | null>(null);
  const total = props.total || 1;
  return (
    <div class="splitbar">
      <div class="splitbar-track" style={{ height: `${props.height ?? 20}px` }} role="img" aria-label={segs.map((s) => `${s.label} ${fmt(s.value)}`).join(', ')}>
        {segs.map((s) => (
          <div
            class={`splitbar-seg ${hover && hover !== s.key ? 'dim' : ''}`}
            style={{ flexGrow: s.value / total, background: s.color }}
            onPointerEnter={() => setHover(s.key)}
            onPointerLeave={() => setHover(null)}
          >
            <span class="splitbar-tip">
              <strong>{s.label}</strong>
              {fmt(s.value)} · {pct(s.value / total)}
            </span>
          </div>
        ))}
      </div>
      {props.legend !== false && (
        <ul class="legend">
          {segs.map((s) => (
            <li class={hover && hover !== s.key ? 'dim' : ''} onPointerEnter={() => setHover(s.key)} onPointerLeave={() => setHover(null)}>
              <span class="legend-swatch" style={{ background: s.color }} />
              <span class="legend-label">{s.label}</span>
              <span class="legend-value">{fmt(s.value)}</span>
              <span class="legend-pct">{pct(s.value / total)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Responsive width hook                                              */
/* ------------------------------------------------------------------ */

function useWidth<T extends HTMLElement>(): [preact.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [w, setW] = useState(600);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

/* ------------------------------------------------------------------ */
/* Take-home curve — net pay across gross salaries                    */
/* ------------------------------------------------------------------ */

export interface CurvePoint {
  gross: number;
  net: number;
  rate: number;
}

const niceStep = (max: number) => {
  const raw = max / 5;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / pow;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * pow;
};

const kEur = (n: number) => (n >= 1000 ? `€${Math.round(n / 1000)}k` : `€${n}`);

export function TakeHomeCurve(props: { points: CurvePoint[]; you: CurvePoint; caption?: ComponentChildren }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const height = 260;
  const m = { t: 16, r: 16, b: 32, l: 52 };
  const W = width - m.l - m.r;
  const H = height - m.t - m.b;
  const pts = props.points;
  const maxX = pts[pts.length - 1]?.gross ?? 1;
  const maxY = maxX;
  const x = (v: number) => m.l + (v / maxX) * W;
  const y = (v: number) => m.t + H - (v / maxY) * H;
  const step = niceStep(maxX);
  const ticks = useMemo(() => {
    const t: number[] = [];
    for (let v = 0; v <= maxX + 1; v += step) t.push(v);
    return t;
  }, [maxX, step]);

  const netPath = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.gross).toFixed(1)},${y(p.net).toFixed(1)}`).join('');
  const areaPath = `${netPath}L${x(maxX)},${y(0)}L${x(0)},${y(0)}Z`;
  const [hover, setHover] = useState<CurvePoint | null>(null);

  const onMove = (e: PointerEvent) => {
    const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
    const gx = ((e.clientX - rect.left - m.l) / W) * maxX;
    if (gx < 0 || gx > maxX) return setHover(null);
    let best = pts[0];
    for (const p of pts) if (Math.abs(p.gross - gx) < Math.abs(best.gross - gx)) best = p;
    setHover(best);
  };

  const youIn = props.you.gross <= maxX;
  const hp = hover ?? null;

  return (
    <div class="curve" ref={ref}>
      <svg width={width} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label="Line chart of take-home pay against gross salary">
        <defs>
          <linearGradient id="netfill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="var(--viz-net)" stop-opacity="0.28" />
            <stop offset="1" stop-color="var(--viz-net)" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g>
            <line class="grid" x1={m.l} x2={m.l + W} y1={y(t)} y2={y(t)} />
            <text class="axis-label" x={m.l - 8} y={y(t) + 4} text-anchor="end">
              {kEur(t)}
            </text>
            <text class="axis-label" x={x(t)} y={height - 10} text-anchor="middle">
              {kEur(t)}
            </text>
          </g>
        ))}
        {/* Gross reference diagonal */}
        <line class="ref-line" x1={x(0)} y1={y(0)} x2={x(maxX)} y2={y(maxY)} />
        <text class="ref-label" x={x(maxX * 0.62)} y={y(maxY * 0.62) - 8} text-anchor="end">
          Gross (no tax)
        </text>
        <path d={areaPath} fill="url(#netfill)" />
        <path d={netPath} class="net-line" />
        <text class="series-label" x={x(maxX) - 4} y={y(pts[pts.length - 1].net) + 20} text-anchor="end">
          Take-home
        </text>
        {youIn && (
          <g class="you">
            <line class="you-drop" x1={x(props.you.gross)} x2={x(props.you.gross)} y1={y(props.you.net)} y2={y(0)} />
            <circle cx={x(props.you.gross)} cy={y(props.you.net)} r="7" />
            <text x={x(props.you.gross)} y={y(props.you.net) - 14} text-anchor={props.you.gross > maxX * 0.8 ? 'end' : 'middle'}>
              You
            </text>
          </g>
        )}
        {hp && (
          <g class="crosshair">
            <line x1={x(hp.gross)} x2={x(hp.gross)} y1={m.t} y2={m.t + H} />
            <circle cx={x(hp.gross)} cy={y(hp.net)} r="5" />
          </g>
        )}
      </svg>
      {hp && (
        <div class="chart-tip" style={{ left: `${Math.min(width - 170, Math.max(0, x(hp.gross) + 12))}px`, top: `${m.t}px` }}>
          <div class="chart-tip-title">{eurWhole(hp.gross)} gross</div>
          <div>
            <span class="legend-swatch" style={{ background: 'var(--viz-net)' }} /> Take-home <b>{eurWhole(hp.net)}</b>
          </div>
          <div class="muted">Effective tax {pct(hp.rate)}</div>
        </div>
      )}
      {props.caption && <p class="chart-caption">{props.caption}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Simple horizontal comparison bars                                  */
/* ------------------------------------------------------------------ */

export function CompareBars(props: {
  rows: { label: ComponentChildren; value: number; highlight?: boolean; note?: ComponentChildren }[];
  format?: (n: number) => string;
}) {
  const fmt = props.format ?? eurWhole;
  const max = Math.max(...props.rows.map((r) => r.value), 1);
  return (
    <div class="cbars">
      {props.rows.map((r) => (
        <div class={`cbar ${r.highlight ? 'hl' : ''}`}>
          <div class="cbar-head">
            <span class="cbar-label">{r.label}</span>
            <span class="cbar-value">{fmt(r.value)}</span>
          </div>
          <div class="cbar-track">
            <div class="cbar-fill" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
          {r.note && <div class="cbar-note">{r.note}</div>}
        </div>
      ))}
    </div>
  );
}
