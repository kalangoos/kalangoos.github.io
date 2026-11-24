// Creates <prefix>/index.html for each published locale that uses a URL prefix (en, es, …).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const locales = JSON.parse(readFileSync(join(root, 'src/locales.json'), 'utf8'));
const template = readFileSync(join(root, 'index.html'), 'utf8');

for (const loc of locales.locales) {
  if (!loc.published || !loc.prefix) continue;
  const dir = join(root, loc.prefix);
  mkdirSync(dir, { recursive: true });
  const html = template
    .replace(/lang="[^"]*"/, `lang="${loc.id}"`)
    .replace(/src="\/src\/entry[^"]*"/, 'src="/src/entry.tsx"');
  writeFileSync(join(dir, 'index.html'), html);
  console.log(`wrote ${loc.prefix}/index.html`);
}

// Keep the default (pt-BR) entry path consistent.
const rootHtml = template.replace(/src="\/src\/entry[^"]*"/, 'src="/src/entry.tsx"');
if (rootHtml !== readFileSync(join(root, 'index.html'), 'utf8')) {
  writeFileSync(join(root, 'index.html'), rootHtml);
  console.log('updated index.html entry');
}
