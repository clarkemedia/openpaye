import { hydrateOrRender } from '../lib/mount';
import '@fontsource-variable/google-sans-flex/rond.css';
import '../styles.css';
import { EmployerApp } from './employer-app';
import { applyTheme, type SeedId, type ThemeMode } from '../lib/theme';
import { loadPref } from '../lib/state';

applyTheme(loadPref<SeedId>('seed', 'shamrock'), loadPref<ThemeMode>('mode', 'system'));
hydrateOrRender(<EmployerApp />, document.getElementById('app')!);
