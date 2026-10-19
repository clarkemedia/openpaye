import { defineConfig } from 'vite';

// Builds dist/widget.js — a standalone IIFE with the tax engine and no framework.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    copyPublicDir: false,
    lib: { entry: 'src/widget/widget.ts', name: 'OpenPAYEWidget', formats: ['iife'], fileName: () => 'widget.js' },
  },
});
