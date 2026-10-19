import { DEFAULT_INPUTS, type Inputs } from '../tax/engine';
import { YEAR_LIST } from '../tax/years';

/* Inputs are kept in the URL hash so any calculation can be shared or bookmarked. */

function b64encode(s: string) {
  return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function b64decode(s: string) {
  return decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
}

/** Only store fields that differ from the defaults, to keep links short. */
function diff(obj: any, base: any): any {
  if (Array.isArray(obj)) return JSON.stringify(obj) === JSON.stringify(base) ? undefined : obj;
  if (obj && typeof obj === 'object') {
    const out: any = {};
    for (const k of Object.keys(obj)) {
      const d = diff(obj[k], base?.[k]);
      if (d !== undefined) out[k] = d;
    }
    return Object.keys(out).length ? out : undefined;
  }
  return obj === base ? undefined : obj;
}

function merge(base: any, patch: any): any {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return patch ?? base;
  const out: any = { ...base };
  for (const k of Object.keys(base)) {
    if (k in patch) out[k] = typeof base[k] === 'object' && !Array.isArray(base[k]) ? merge(base[k], patch[k]) : patch[k];
  }
  return out;
}

export function encodeInputs(inputs: Inputs): string {
  const d = diff(inputs, DEFAULT_INPUTS);
  return d ? b64encode(JSON.stringify(d)) : '';
}

export function decodeInputs(hash: string): Inputs | null {
  const m = hash.match(/[#&]c=([\w-]+)/);
  if (!m) return null;
  try {
    const parsed = merge(DEFAULT_INPUTS, JSON.parse(b64decode(m[1]))) as Inputs;
    if (!YEAR_LIST.includes(parsed.year)) parsed.year = DEFAULT_INPUTS.year;
    return parsed;
  } catch {
    return null;
  }
}

export function shareUrl(inputs: Inputs): string {
  const code = encodeInputs(inputs);
  return `${location.origin}${location.pathname}${code ? `#c=${code}` : ''}`;
}

/* Per-viewer preferences */
export function loadPref<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(`openpaye:${key}`);
    return v === null ? fallback : (JSON.parse(v) as T);
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown) {
  try {
    localStorage.setItem(`openpaye:${key}`, JSON.stringify(value));
  } catch {
    /* storage unavailable */
  }
}
