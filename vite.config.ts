import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

// Static pages: / (pt-BR), /en/ (English) and /membros/ (the members area, pt-BR). `npm run build` also pre-renders both
// (scripts/prerender.mjs), so the HTML works without JavaScript and for search engines.
export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        en: resolve(import.meta.dirname, 'en/index.html'),
        membros: resolve(import.meta.dirname, 'membros/index.html'),
      },
    },
  },
  preview: { host: '127.0.0.1', port: 18900, strictPort: true },
});
