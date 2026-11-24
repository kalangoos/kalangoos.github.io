// Fails when any published locale JSON does not have exactly the keys (and array lengths) of pt-BR.json.
// Run by `npm run build`; `npm run check:placeholders` lists the "[PREENCHER]" / "[FILL IN]" markers.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dir = join(root, 'src', 'content');
const locales = JSON.parse(readFileSync(join(root, 'src/locales.json'), 'utf8'));
const published = locales.locales.filter((l) => l.published).map((l) => l.id);
const pt = JSON.parse(readFileSync(join(dir, 'pt-BR.json'), 'utf8'));
const errors = [];

function same(a, b, path, lang) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return errors.push(`${lang} ${path}: one is an array, the other is not`);
    if (a.length !== b.length) errors.push(`${lang} ${path}: ${a.length} items in pt-BR, ${b.length} in ${lang}`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) same(a[i], b[i], `${path}[${i}]`, lang);
  } else if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') return errors.push(`${lang} ${path}: missing`);
    for (const k of Object.keys(a)) k in b ? same(a[k], b[k], `${path}.${k}`, lang) : errors.push(`${lang} ${path}.${k}: missing`);
    for (const k of Object.keys(b)) if (!(k in a)) errors.push(`${lang} ${path}.${k}: extra (not in pt-BR)`);
  } else if (typeof a !== typeof b) errors.push(`${lang} ${path}: different types`);
}

for (const lang of published) {
  const file = join(dir, `${lang}.json`);
  if (!existsSync(file)) {
    errors.push(`${lang}: missing src/content/${lang}.json`);
    continue;
  }
  if (lang === 'pt-BR') continue;
  const other = JSON.parse(readFileSync(file, 'utf8'));
  same(pt, other, '$', lang);
}

const mode = process.argv[2];
if (mode === '--placeholders') {
  const found = [];
  const walk = (v, path, lang) => {
    if (typeof v === 'string') {
      if (/\[(PREENCHER|FILL IN)/.test(v)) found.push(`${lang} ${path}: ${v}`);
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, lang);
  };
  for (const lang of published) {
    const file = join(dir, `${lang}.json`);
    if (!existsSync(file)) continue;
    walk(JSON.parse(readFileSync(file, 'utf8')), '$', lang);
  }
  console.log(found.length ? found.join('\n') : 'no placeholders left');
  process.exit(found.length ? 1 : 0);
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log(`content: ${published.join(', ')} match pt-BR shape`);
