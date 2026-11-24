// Writes src/routes.json from src/locales.json so every published locale gets page paths.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const locales = JSON.parse(readFileSync(join(root, 'src/locales.json'), 'utf8'));

function pathOf(lang, page) {
  const loc = locales.locales.find((l) => l.id === lang);
  if (page === 'notfound') return '/404.html';
  if (page === 'home') return loc.prefix ? `/${loc.prefix}/` : '/';
  const map = locales.slugs[page];
  const slug = map[lang] ?? map['*'];
  return loc.prefix ? `/${loc.prefix}/${slug}/` : `/${slug}/`;
}

const pages = ['home', 'download', 'security', 'docs', 'notes', 'contribute', 'members', 'notfound'];
const published = locales.locales.filter((l) => l.published).map((l) => l.id);
const out = {
  origin: locales.origin,
  pages: Object.fromEntries(
    pages.map((page) => [page, Object.fromEntries(published.map((lang) => [lang, pathOf(lang, page)]))]),
  ),
};

const file = join(root, 'src/routes.json');
writeFileSync(file, `${JSON.stringify(out, null, 2)}\n`);
console.log(`wrote routes.json (${published.length} locales)`);
