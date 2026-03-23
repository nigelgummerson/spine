import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/spine/',
  build: {
    target: 'es2020',
  },
  test: {
    // Component tests use jsdom; data-layer tests use default (node)
    environmentMatchGlobs: [
      ['src/components/**/*.test.ts*', 'jsdom'],
    ],
    // Node v25 localStorage conflicts with jsdom — polyfill before imports
    setupFiles: ['src/components/__tests__/setup.ts'],
  },
});
