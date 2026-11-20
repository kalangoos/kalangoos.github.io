// After `vite build` (client) and `vite build --ssr` (server entry), write the rendered HTML of
// each language into its page, and the members area's entry card into /membros/, so dist/ works as plain static files.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { render, renderMembers } = await import(pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href);
for (const [lang, file] of [['pt-BR', 'dist/index.html'], ['en', 'dist/en/index.html']]) {
  const path = join(root, file);
  const html = readFileSync(path, 'utf8');
  if (!html.includes('<!--app-->')) throw new Error(`${file}: marker <!--app--> not found`);
  writeFileSync(path, html.replace('<!--app-->', render(lang)));
  console.log(`prerendered ${file}`);
}
{
  const path = join(root, 'dist/membros/index.html');
  const html = readFileSync(path, 'utf8');
  if (!html.includes('<!--app-->')) throw new Error('dist/membros/index.html: marker <!--app--> not found');
  writeFileSync(path, html.replace('<!--app-->', renderMembers()));
  console.log('prerendered dist/membros/index.html');
}
rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
