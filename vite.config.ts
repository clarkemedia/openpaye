import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { readFileSync } from 'node:fs';
import { PRIVACY_META } from './src/config/csp';

// The single-file build can't load icon files, so it gets the logo inline instead
// Privacy rules in every page (not the single file, which needs inline scripts)
const privacyMeta = {
  name: 'privacy-meta',
  apply: 'build' as const,
  transformIndexHtml: (html: string) => html.replace(/(<meta charset="UTF-8" \/>)/, `$1\n    ${PRIVACY_META}`),
};

const inlineIcon = {
  name: 'inline-icon',
  transformIndexHtml(html: string) {
    const svg = readFileSync('public/favicon.svg', 'utf8').trim();
    const icon = `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(svg)}" />`;
    return html.replace(/<link rel="(icon|apple-touch-icon|manifest)"[^>]*>\s*/g, '').replace('</head>', `    ${icon}\n  </head>`);
  },
};

// `npm run build`         → dist/ (static site, deploy anywhere)
// `npm run build:single`  → dist-single/index.html (one self-contained file)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [preact(), ...(mode === 'single' ? [viteSingleFile(), inlineIcon] : [privacyMeta])],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    manifest: mode !== 'single',
    rollupOptions:
      mode === 'single'
        ? undefined
        : { input: { main: 'index.html', embed: 'embed.html', employer: 'employer-cost/index.html' } },
    assetsInlineLimit: mode === 'single' ? 100_000_000 : 4096,
  },
  test: { include: ['src/**/*.test.ts'] },
}));
