import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const locales = JSON.parse(readFileSync(join(root, 'src/locales.json'), 'utf8'));

// One static HTML entry per published locale: / (pt-BR) and /<prefix>/ for the others.
// `npm run build` also pre-renders every page (scripts/prerender.mjs).
const input: Record<string, string> = {
  main: resolve(root, 'index.html'),
};
for (const loc of locales.locales) {
  if (!loc.published || !loc.prefix) continue;
  input[loc.prefix] = resolve(root, loc.prefix, 'index.html');
}

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: {
    target: 'es2022',
    rollupOptions: { input },
  },
  preview: { host: '127.0.0.1', port: 18900, strictPort: true },
});
