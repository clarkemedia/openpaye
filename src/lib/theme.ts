/**
 * Material 3 Expressive dynamic colour.
 * Generates the full M3 colour-role token set from a seed colour for both
 * light and dark schemes, and follows the OS setting unless overridden.
 */
import {
  argbFromHex,
  hexFromArgb,
  Hct,
  MaterialDynamicColors as M,
  SchemeTonalSpot,
  type DynamicColor,
  type DynamicScheme,
} from '@material/material-color-utilities';

export type ThemeMode = 'system' | 'light' | 'dark';

export const SEEDS = [
  { id: 'shamrock', name: 'Shamrock', hex: '#1f8a4c' },
  { id: 'atlantic', name: 'Atlantic', hex: '#1b6fb5' },
  { id: 'heather', name: 'Heather', hex: '#8a55b8' },
  { id: 'amber', name: 'Amber', hex: '#d68a14' },
  { id: 'fuchsia', name: 'Fuchsia', hex: '#c2387a' },
] as const;

export type SeedId = (typeof SEEDS)[number]['id'];

const ROLES: Record<string, DynamicColor> = {
  primary: M.primary,
  'on-primary': M.onPrimary,
  'primary-container': M.primaryContainer,
  'on-primary-container': M.onPrimaryContainer,
  'primary-fixed': M.primaryFixed,
  'primary-fixed-dim': M.primaryFixedDim,
  'on-primary-fixed': M.onPrimaryFixed,
  secondary: M.secondary,
  'on-secondary': M.onSecondary,
  'secondary-container': M.secondaryContainer,
  'on-secondary-container': M.onSecondaryContainer,
  tertiary: M.tertiary,
  'on-tertiary': M.onTertiary,
  'tertiary-container': M.tertiaryContainer,
  'on-tertiary-container': M.onTertiaryContainer,
  error: M.error,
  'on-error': M.onError,
  'error-container': M.errorContainer,
  'on-error-container': M.onErrorContainer,
  surface: M.surface,
  'surface-dim': M.surfaceDim,
  'surface-bright': M.surfaceBright,
  'surface-container-lowest': M.surfaceContainerLowest,
  'surface-container-low': M.surfaceContainerLow,
  'surface-container': M.surfaceContainer,
  'surface-container-high': M.surfaceContainerHigh,
  'surface-container-highest': M.surfaceContainerHighest,
  'on-surface': M.onSurface,
  'on-surface-variant': M.onSurfaceVariant,
  outline: M.outline,
  'outline-variant': M.outlineVariant,
  'inverse-surface': M.inverseSurface,
  'inverse-on-surface': M.inverseOnSurface,
  'inverse-primary': M.inversePrimary,
  scrim: M.scrim,
  shadow: M.shadow,
};

function schemeVars(scheme: DynamicScheme): string {
  return Object.entries(ROLES)
    .map(([name, role]) => `--md-${name}:${hexFromArgb(role.getArgb(scheme))};`)
    .join('');
}

function buildScheme(hex: string, dark: boolean): DynamicScheme {
  return new SchemeTonalSpot(Hct.fromInt(argbFromHex(hex)), dark, 0, '2025');
}

export function themeCss(hex: string, scope = ':root'): string {
  const light = schemeVars(buildScheme(hex, false));
  const dark = schemeVars(buildScheme(hex, true));
  return [
    `${scope}{${light}color-scheme:light;}`,
    `@media (prefers-color-scheme: dark){${scope}:not([data-theme="light"]){${dark}color-scheme:dark;}}`,
    `${scope}[data-theme="dark"]{${dark}color-scheme:dark;}`,
  ].join('\n');
}

/** Every palette in one stylesheet, for pre-rendered pages (selected with data-seed). */
export function allThemesCss(): string {
  return SEEDS.map((s, i) => themeCss(s.hex, i === 0 ? ':root' : `:root[data-seed="${s.id}"]`)).join('\n');
}

export function applyTheme(seed: SeedId, mode: ThemeMode) {
  const hex = SEEDS.find((s) => s.id === seed)?.hex ?? SEEDS[0].hex;
  let el = document.getElementById('md-theme') as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = 'md-theme';
    document.head.appendChild(el);
  }
  el.textContent = themeCss(hex);
  const root = document.documentElement;
  // Only clear an attribute we set ourselves, so a host page's own theme choice survives
  if (mode === 'system') {
    if (root.dataset.themeOwner === 'openpaye') {
      root.removeAttribute('data-theme');
      delete root.dataset.themeOwner;
    }
  } else {
    root.setAttribute('data-theme', mode);
    root.dataset.themeOwner = 'openpaye';
  }
  // Keep the browser chrome in step with the surface colour
  requestAnimationFrame(() => {
    const surface = getComputedStyle(root).getPropertyValue('--md-surface').trim();
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', surface);
  });
}
