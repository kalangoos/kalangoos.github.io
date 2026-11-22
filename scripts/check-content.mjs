// Fails when src/content/en.json does not have exactly the keys (and array lengths) of pt-BR.json, so a page is
// never half translated. Run by `npm run build`; `npm run check:placeholders` lists the "[PREENCHER]" markers.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content');
const pt = JSON.parse(readFileSync(join(dir, 'pt-BR.json'), 'utf8'));
const en = JSON.parse(readFileSync(join(dir, 'en.json'), 'utf8'));
const errors = [];

function same(a, b, path) {
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b)) return errors.push(`${path}: one is an array, the other is not`);
    if (a.length !== b.length) errors.push(`${path}: ${a.length} items in pt-BR, ${b.length} in en`);
    for (let i = 0; i < Math.min(a.length, b.length); i++) same(a[i], b[i], `${path}[${i}]`);
  } else if (a && typeof a === 'object') {
    if (!b || typeof b !== 'object') return errors.push(`${path}: missing in en`);
    for (const k of Object.keys(a)) k in b ? same(a[k], b[k], `${path}.${k}`) : errors.push(`${path}.${k}: missing in en`);
    for (const k of Object.keys(b)) if (!(k in a)) errors.push(`${path}.${k}: missing in pt-BR`);
  } else if (typeof a !== typeof b) errors.push(`${path}: different types`);
}
same(pt, en, '$');

const mode = process.argv[2];
if (mode === '--placeholders') {
  const found = [];
  const walk = (v, path, lang) => {
    if (typeof v === 'string') { if (/\[(PREENCHER|FILL IN)/.test(v)) found.push(`${lang} ${path}: ${v}`); }
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`, lang);
  };
  walk(pt, '$', 'pt-BR'); walk(en, '$', 'en');
  console.log(found.length ? found.join('\n') : 'no placeholders left');
  process.exit(found.length ? 1 : 0);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('content: pt-BR and en have the same shape');
