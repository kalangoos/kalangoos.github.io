// After `vite build` (client) and `vite build --ssr` (server entry), write the rendered HTML of
// each language into its page, so dist/ works as plain static files.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { render } = await import(pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href);
for (const [lang, file] of [['pt-BR', 'dist/index.html'], ['en', 'dist/en/index.html']]) {
  const path = join(root, file);
  const html = readFileSync(path, 'utf8');
  if (!html.includes('<!--app-->')) throw new Error(`${file}: marker <!--app--> not found`);
  writeFileSync(path, html.replace('<!--app-->', render(lang)));
  console.log(`prerendered ${file}`);
}
rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
