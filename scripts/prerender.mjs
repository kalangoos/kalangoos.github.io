// After `vite build` (client) and `vite build --ssr` (server entry): writes the rendered HTML of every page and
// language (dist/<path>/index.html, dist/404.html), plus sitemap.xml, so dist/ works as plain static files and the
// text is there without JavaScript.
import { readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { render } = await import(pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href);
const localesDoc = JSON.parse(readFileSync(join(root, 'src/locales.json'), 'utf8'));
const routes = JSON.parse(readFileSync(join(root, 'src/routes.json'), 'utf8'));
const published = localesDoc.locales.filter((l) => l.published);
const langIds = published.map((l) => l.id);
const byId = Object.fromEntries(published.map((l) => [l.id, l]));

const content = Object.fromEntries(
  langIds.map((id) => [id, JSON.parse(readFileSync(join(root, 'src/content', `${id}.json`), 'utf8'))]),
);

const templates = {};
for (const loc of published) {
  const file = loc.prefix ? join(root, 'dist', loc.prefix, 'index.html') : join(root, 'dist/index.html');
  if (!existsSync(file)) throw new Error(`missing vite template: ${file}`);
  templates[loc.id] = readFileSync(file, 'utf8');
}

const origin = routes.origin;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const HIDDEN = new Set(['notfound', 'members']);
const AUTH_ORIGIN = 'https://auth.kalangoos.com';
{
  const url = (loadEnv('production', root, 'VITE_').VITE_AUTH_URL ?? '').trim().replace(/\/+$/, '');
  if (url && url !== AUTH_ORIGIN) throw new Error(`VITE_AUTH_URL is "${url}", expected empty (login off) or ${AUTH_ORIGIN}`);
}

function head(lang, page) {
  const c = content[lang];
  const m = page === 'home' ? c.meta : page === 'members' ? c.members : c.pages[page];
  const url = origin + routes.pages[page][lang];
  const lines = [`<meta name="description" content="${esc(m.description)}" />`];
  if (page === 'members') {
    lines.push('<meta name="robots" content="noindex, nofollow" />');
    return { title: m.title, tags: lines.join('\n    ') };
  }
  if (page !== 'notfound') {
    lines.push(`<link rel="canonical" href="${url}" />`);
    for (const l of langIds) {
      lines.push(`<link rel="alternate" hreflang="${byId[l].hreflang}" href="${origin + routes.pages[page][l]}" />`);
    }
    lines.push(`<link rel="alternate" hreflang="x-default" href="${origin + routes.pages[page][localesDoc.default]}" />`);
  } else {
    lines.push('<meta name="robots" content="noindex" />');
  }
  lines.push(
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="KalangoOS" />',
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="${byId[lang].ogLocale}" />`,
  );
  for (const l of langIds) {
    if (l === lang) continue;
    lines.push(`<meta property="og:locale:alternate" content="${byId[l].ogLocale}" />`);
  }
  lines.push(
    `<meta property="og:image" content="${origin}/og.png" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(c.meta.ogImageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  );
  return { title: m.title, tags: lines.join('\n    ') };
}

function csp(html) {
  const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  if (inline.length !== 1) throw new Error(`expected exactly one inline script in the template, found ${inline.length}`);
  const hash = createHash('sha256').update(inline[0]).digest('base64');
  return [
    "default-src 'none'",
    `script-src 'self' 'sha256-${hash}'`,
    "style-src 'self'",
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: https://raw.githubusercontent.com https://github.com https://camo.githubusercontent.com https://avatars.githubusercontent.com",
    "font-src 'self'",
    `connect-src ${AUTH_ORIGIN} https://api.github.com https://raw.githubusercontent.com`,
    "base-uri 'none'",
    "form-action 'none'",
    "object-src 'none'",
  ].join('; ');
}

function write(lang, page) {
  const { title, tags } = head(lang, page);
  let html = templates[lang];
  if (!html.includes('<!--app-->') || !html.includes('<!--head-->')) throw new Error('template markers not found');
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace('<!--head-->', tags)
    .replace('<meta charset="UTF-8" />', (m) => (page === 'members' ? `${m}\n    <meta http-equiv="Content-Security-Policy" content="${csp(templates[lang])}" />` : m))
    .replace(/<html lang="[^"]*" data-page="[^"]*">/, `<html lang="${lang}" data-page="${page}">`)
    .replace('<!--app-->', render(lang, page));
  const path = routes.pages[page][lang];
  const file = path.endsWith('/') ? join(root, 'dist', path, 'index.html') : join(root, 'dist', path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log(`prerendered ${path}`);
}

for (const page of Object.keys(routes.pages)) {
  if (page === 'notfound') continue;
  for (const lang of langIds) write(lang, page);
}
write(localesDoc.default, 'notfound');

const urls = Object.keys(routes.pages)
  .filter((p) => !HIDDEN.has(p))
  .map((p) => {
    const alt = langIds.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${byId[l].hreflang}" href="${origin + routes.pages[p][l]}"/>`,
    );
    alt.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${origin + routes.pages[p][localesDoc.default]}"/>`);
    return langIds.map((l) => `  <url>\n    <loc>${origin + routes.pages[p][l]}</loc>\n${alt.join('\n')}\n  </url>`).join('\n');
  });
writeFileSync(
  join(root, 'dist/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
);
console.log('wrote sitemap.xml');

const assets = join(root, 'dist/assets');
for (const f of readdirSync(assets)) {
  if (f.endsWith('.woff')) rmSync(join(assets, f));
  else if (f.endsWith('.css')) {
    const css = readFileSync(join(assets, f), 'utf8');
    writeFileSync(join(assets, f), css.replace(/,\s*url\([^)]*\.woff\)\s*format\(["']woff["']\)/g, ''));
  }
}
rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
