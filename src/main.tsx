import { hydrateOrRender } from './lib/mount';
import '@fontsource-variable/google-sans-flex/rond.css';
import './styles.css';
import { App } from './app';
import { applyTheme, type SeedId, type ThemeMode } from './lib/theme';
import { loadPref } from './lib/state';

// Apply the theme before first paint to avoid a flash
applyTheme(loadPref<SeedId>('seed', 'shamrock'), loadPref<ThemeMode>('mode', 'system'));

hydrateOrRender(<App />, document.getElementById('app')!);
