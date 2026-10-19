import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`         → dist/ (static site, deploy anywhere)
// `npm run build:single`  → dist-single/index.html (one self-contained file)
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [preact(), ...(mode === 'single' ? [viteSingleFile()] : [])],
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
