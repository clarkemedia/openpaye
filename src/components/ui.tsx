import type { ComponentChildren, JSX } from 'preact';
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { ICON_PATHS, type IconName } from './icon-data';

/* ------------------------------------------------------------------ */
/* Icon                                                               */
/* ------------------------------------------------------------------ */

export function Icon({ name, size = 24, class: cls }: { name: IconName; size?: number; class?: string }) {
  return (
    <svg class={`icon ${cls ?? ''}`} width={size} height={size} viewBox="0 -960 960 960" aria-hidden="true">
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                            */
/* ------------------------------------------------------------------ */

type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text' | 'elevated';

export function Button(props: {
  variant?: ButtonVariant;
  icon?: IconName;
  trailingIcon?: IconName;
  children?: ComponentChildren;
  onClick?: (e: MouseEvent) => void;
  size?: 'sm' | 'md';
  type?: 'button' | 'submit';
  class?: string;
  title?: string;
  href?: string;
}) {
  const { variant = 'filled', icon, trailingIcon, children, size = 'md', href } = props;
  const cls = `btn btn-${variant} btn-${size} ${icon ? 'has-icon' : ''} ${props.class ?? ''}`;
  const inner = (
    <>
      <span class="state" />
      {icon && <Icon name={icon} size={20} />}
      {children && <span class="btn-label">{children}</span>}
      {trailingIcon && <Icon name={trailingIcon} size={20} />}
    </>
  );
  if (href)
    return (
      <a class={cls} href={href} target="_blank" rel="noopener" title={props.title}>
        {inner}
      </a>
    );
  return (
    <button type={props.type ?? 'button'} class={cls} onClick={props.onClick} title={props.title}>
      {inner}
    </button>
  );
}

export function IconButton(props: {
  icon: IconName;
  label: string;
  onClick?: (e: MouseEvent) => void;
  variant?: 'standard' | 'tonal' | 'filled' | 'outlined';
  selected?: boolean;
  class?: string;
}) {
  const { variant = 'standard' } = props;
  return (
    <button
      type="button"
      class={`icon-btn icon-btn-${variant} ${props.selected ? 'selected' : ''} ${props.class ?? ''}`}
      aria-label={props.label}
      title={props.label}
      aria-pressed={props.selected === undefined ? undefined : props.selected}
      onClick={props.onClick}
    >
      <span class="state" />
      <Icon name={props.icon} size={24} />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Connected button group (M3 Expressive)                             */
/* ------------------------------------------------------------------ */

export interface GroupOption<T extends string | number> {
  value: T;
  label: ComponentChildren;
  icon?: IconName;
  badge?: string;
  title?: string;
}

export function ButtonGroup<T extends string | number>(props: {
  options: GroupOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  class?: string;
  stretch?: boolean;
}) {
  const { size = 'md' } = props;
  return (
    <div
      class={`btn-group btn-group-${size} ${props.stretch ? 'stretch' : ''} ${props.class ?? ''}`}
      role="radiogroup"
      aria-label={props.label}
    >
      {props.options.map((o) => {
        const sel = o.value === props.value;
        return (
          <button
            type="button"
            role="radio"
            aria-checked={sel}
            class={`seg ${sel ? 'selected' : ''}`}
            title={o.title}
            onClick={() => props.onChange(o.value)}
          >
            <span class="state" />
            {o.icon && <Icon name={o.icon} size={18} />}
            <span class="seg-label">{o.label}</span>
            {o.badge && <span class="seg-badge">{o.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Text field (filled, number-friendly)                               */
/* ------------------------------------------------------------------ */

const fmt = new Intl.NumberFormat('en-IE', { maximumFractionDigits: 2 });

function parseNum(s: string): number {
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

export function NumberField(props: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  hint?: ComponentChildren;
  min?: number;
  max?: number;
  step?: number;
  size?: 'md' | 'xl';
  class?: string;
  autoFocus?: boolean;
  trailing?: ComponentChildren;
}) {
  const id = useId();
  const [text, setText] = useState(() => (props.value ? fmt.format(props.value) : ''));
  const focused = useRef(false);

  // Sync from outside when not editing
  useEffect(() => {
    if (!focused.current) setText(props.value ? fmt.format(props.value) : '');
  }, [props.value]);

  const clampv = (n: number) => Math.min(props.max ?? Infinity, Math.max(props.min ?? 0, n));

  const step = (dir: number) => {
    const n = clampv(+(props.value + dir * (props.step ?? 1)).toFixed(2));
    props.onChange(n);
  };

  return (
    <div class={`field field-${props.size ?? 'md'} ${text ? 'has-value' : ''} ${props.class ?? ''}`}>
      <div class="field-box">
        {props.prefix && <span class="field-prefix">{props.prefix}</span>}
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder=" "
          value={text}
          autoFocus={props.autoFocus}
          onFocus={(e) => {
            focused.current = true;
            (e.currentTarget as HTMLInputElement).select();
          }}
          onBlur={() => {
            focused.current = false;
            setText(props.value ? fmt.format(props.value) : '');
          }}
          onInput={(e) => {
            const t = (e.currentTarget as HTMLInputElement).value;
            setText(t);
            props.onChange(clampv(parseNum(t)));
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              step(1);
            } else if (e.key === 'ArrowDown') {
              e.preventDefault();
              step(-1);
            }
          }}
        />
        <label for={id}>{props.label}</label>
        {props.suffix && <span class="field-suffix">{props.suffix}</span>}
        {props.trailing}
      </div>
      {props.hint && <div class="field-hint">{props.hint}</div>}
    </div>
  );
}

export function SelectField<T extends string | number>(props: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  class?: string;
  hint?: ComponentChildren;
}) {
  const id = useId();
  return (
    <div class={`field field-md has-value select ${props.class ?? ''}`}>
      <div class="field-box">
        <select
          id={id}
          value={String(props.value)}
          onChange={(e) => {
            const raw = (e.currentTarget as HTMLSelectElement).value;
            const opt = props.options.find((o) => String(o.value) === raw);
            if (opt) props.onChange(opt.value);
          }}
        >
          {props.options.map((o) => (
            <option value={String(o.value)}>{o.label}</option>
          ))}
        </select>
        <label for={id}>{props.label}</label>
        <Icon name="keyboard_arrow_down" class="select-arrow" />
      </div>
      {props.hint && <div class="field-hint">{props.hint}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Switch                                                             */
/* ------------------------------------------------------------------ */

export function Switch(props: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ComponentChildren;
  description?: ComponentChildren;
  icon?: IconName;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <label class={`switch-row ${props.disabled ? 'disabled' : ''}`} for={id}>
      {props.icon && (
        <span class="switch-lead">
          <Icon name={props.icon} size={22} />
        </span>
      )}
      <span class="switch-text">
        <span class="switch-label">{props.label}</span>
        {props.description && <span class="switch-desc">{props.description}</span>}
      </span>
      <span class={`switch ${props.checked ? 'on' : ''}`}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          checked={props.checked}
          disabled={props.disabled}
          onChange={(e) => props.onChange((e.currentTarget as HTMLInputElement).checked)}
        />
        <span class="switch-track">
          <span class="switch-handle">
            <Icon name={props.checked ? 'check' : 'close'} size={16} />
          </span>
        </span>
      </span>
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Expander (accordion card section)                                  */
/* ------------------------------------------------------------------ */

export function Expander(props: {
  title: ComponentChildren;
  icon: IconName;
  summary?: ComponentChildren;
  children: ComponentChildren;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(!!props.defaultOpen);
  const id = useId();
  return (
    <section class={`expander ${open ? 'open' : ''}`}>
      <button type="button" class="expander-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
        <span class="state" />
        <span class="expander-icon">
          <Icon name={props.icon} size={22} />
        </span>
        <span class="expander-titles">
          <span class="expander-title">
            {props.title}
            {!!props.badge && <span class="count-badge">{props.badge}</span>}
          </span>
          {props.summary && <span class="expander-summary">{props.summary}</span>}
        </span>
        <Icon name="keyboard_arrow_down" class="expander-chevron" />
      </button>
      <div class="expander-body" id={id} role="region">
        <div class="expander-inner">{open && props.children}</div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Expressive shapes (morphable — every shape uses the same point count) */
/* ------------------------------------------------------------------ */

export type ShapeName = 'cookie4' | 'cookie6' | 'cookie9' | 'cookie12' | 'sunny' | 'flower' | 'circle' | 'pill' | 'clover';

const SHAPE_SPEC: Record<ShapeName, { n: number; a: number; sharp?: number }> = {
  circle: { n: 1, a: 0 },
  pill: { n: 2, a: 0.08 },
  cookie4: { n: 4, a: 0.08 },
  cookie6: { n: 6, a: 0.06 },
  cookie9: { n: 9, a: 0.05 },
  cookie12: { n: 12, a: 0.04 },
  sunny: { n: 8, a: 0.09, sharp: 2 },
  flower: { n: 8, a: 0.14 },
  clover: { n: 4, a: 0.2 },
};

const POINTS = 96;

export function shapePath(name: ShapeName, size = 100): string {
  const { n, a, sharp } = SHAPE_SPEC[name];
  const c = size / 2;
  const R = c / (1 + a);
  const pts: string[] = [];
  for (let i = 0; i < POINTS; i++) {
    const t = (i / POINTS) * Math.PI * 2;
    let wave = Math.cos(n * t);
    if (sharp) wave = Math.sign(wave) * Math.pow(Math.abs(wave), 1 / sharp);
    const r = R * (1 + a * wave);
    pts.push(`${(c + r * Math.cos(t)).toFixed(2)},${(c + r * Math.sin(t)).toFixed(2)}`);
  }
  return `M${pts.join('L')}Z`;
}

export function Shape(props: { name: ShapeName; class?: string; style?: JSX.CSSProperties; children?: ComponentChildren }) {
  return (
    <svg class={`shape ${props.class ?? ''}`} viewBox="0 0 100 100" style={props.style} aria-hidden="true">
      <path d={shapePath(props.name)} style={{ d: `path("${shapePath(props.name)}")` } as any} />
      {props.children}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Animated number                                                    */
/* ------------------------------------------------------------------ */

export function useAnimatedNumber(target: number, duration = 650): number {
  const [v, setV] = useState(target);
  const from = useRef(target);
  const raf = useRef(0);
  useEffect(() => {
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      setV(target);
      from.current = target;
      return;
    }
    const start = performance.now();
    const f = from.current;
    cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // Spring-ish ease out with gentle overshoot
      const e = 1 - Math.pow(1 - p, 3) * Math.cos(p * Math.PI * 0.5);
      const cur = f + (target - f) * e;
      setV(cur);
      from.current = cur;
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else from.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target]);
  return v;
}

/* ------------------------------------------------------------------ */
/* Snackbar                                                           */
/* ------------------------------------------------------------------ */

export function Snackbar({ message }: { message: string | null }) {
  return (
    <div class={`snackbar ${message ? 'show' : ''}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

export function Tip({ children }: { children: ComponentChildren }) {
  return (
    <span class="tip" tabIndex={0}>
      <Icon name="info" size={16} />
      <span class="tip-bubble" role="tooltip">
        {children}
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Slider (M3 Expressive: thick track, bar handle)                    */
/* ------------------------------------------------------------------ */

export function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (n: number) => void;
  format?: (n: number) => string;
  hint?: ComponentChildren;
}) {
  const id = useId();
  const p = ((props.value - props.min) / Math.max(1e-9, props.max - props.min)) * 100;
  return (
    <div class="slider-field">
      <div class="slider-head">
        <label for={id}>{props.label}</label>
        <span class="slider-value">{props.format ? props.format(props.value) : props.value}</span>
      </div>
      <input
        id={id}
        type="range"
        class="slider"
        min={props.min}
        max={props.max}
        step={props.step ?? 1}
        value={props.value}
        style={{ '--p': `${p}%` } as JSX.CSSProperties}
        onInput={(e) => props.onChange(Number((e.currentTarget as HTMLInputElement).value))}
      />
      {props.hint && <div class="field-hint">{props.hint}</div>}
    </div>
  );
}
