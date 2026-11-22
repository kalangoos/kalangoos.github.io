// After `vite build` (client) and `vite build --ssr` (server entry): writes the rendered HTML of every page and
// language (dist/<path>/index.html, dist/404.html), the members area entry card into /membros/, plus sitemap.xml,
// so dist/ works as plain static files and the text is there without JavaScript. The two Vite pages
// (dist/index.html, dist/en/index.html) are the templates.
import { readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { render, renderMembers } = await import(pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href);
const routes = JSON.parse(readFileSync(join(root, 'src/routes.json'), 'utf8'));
const content = {
  'pt-BR': JSON.parse(readFileSync(join(root, 'src/content/pt-BR.json'), 'utf8')),
  en: JSON.parse(readFileSync(join(root, 'src/content/en.json'), 'utf8')),
};
const templates = {
  'pt-BR': readFileSync(join(root, 'dist/index.html'), 'utf8'),
  en: readFileSync(join(root, 'dist/en/index.html'), 'utf8'),
};
const origin = routes.origin;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const OG_LOCALE = { 'pt-BR': 'pt_BR', en: 'en_US' };

function head(lang, page) {
  const c = content[lang];
  const m = page === 'home' ? c.meta : c.pages[page];
  const url = origin + routes.pages[page][lang];
  const lines = [`<meta name="description" content="${esc(m.description)}" />`];
  if (page !== 'notfound') {
    lines.push(`<link rel="canonical" href="${url}" />`);
    for (const l of ['pt-BR', 'en']) lines.push(`<link rel="alternate" hreflang="${l}" href="${origin + routes.pages[page][l]}" />`);
    lines.push(`<link rel="alternate" hreflang="x-default" href="${origin + routes.pages[page]['pt-BR']}" />`);
  } else {
    lines.push('<meta name="robots" content="noindex" />'); // the 404 answers every unknown address: no canonical
  }
  lines.push(
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="KalangoOS" />',
    `<meta property="og:title" content="${esc(m.title)}" />`,
    `<meta property="og:description" content="${esc(m.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:locale" content="${OG_LOCALE[lang]}" />`,
    `<meta property="og:locale:alternate" content="${OG_LOCALE[lang === 'en' ? 'pt-BR' : 'en']}" />`,
    `<meta property="og:image" content="${origin}/og.png" />`,
    '<meta property="og:image:width" content="1200" />',
    '<meta property="og:image:height" content="630" />',
    `<meta property="og:image:alt" content="${esc(c.meta.ogImageAlt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
  );
  return { title: m.title, tags: lines.join('\n    ') };
}

function write(lang, page) {
  const { title, tags } = head(lang, page);
  let html = templates[lang];
  if (!html.includes('<!--app-->') || !html.includes('<!--head-->')) throw new Error('template markers not found');
  html = html
    .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
    .replace('<!--head-->', tags)
    .replace(/<html lang="[^"]*" data-page="[^"]*">/, `<html lang="${lang}" data-page="${page}">`)
    .replace('<!--app-->', render(lang, page));
  const path = routes.pages[page][lang];
  const file = path.endsWith('/') ? join(root, 'dist', path, 'index.html') : join(root, 'dist', path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html);
  console.log(`prerendered ${path}`);
}

const written = [];
for (const page of Object.keys(routes.pages)) {
  if (page === 'notfound') continue;
  for (const lang of ['pt-BR', 'en']) { write(lang, page); written.push(page); }
}
write('pt-BR', 'notfound'); // GitHub Pages serves /404.html for every unknown address

const urls = Object.keys(routes.pages)
  .filter((p) => p !== 'notfound')
  .map((p) => {
    const alt = ['pt-BR', 'en'].map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${origin + routes.pages[p][l]}"/>`);
    alt.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${origin + routes.pages[p]['pt-BR']}"/>`);
    return ['pt-BR', 'en'].map((l) => `  <url>\n    <loc>${origin + routes.pages[p][l]}</loc>\n${alt.join('\n')}\n  </url>`).join('\n');
  });
writeFileSync(
  join(root, 'dist/sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`,
);
console.log('wrote sitemap.xml');

// fonts: every browser that runs this site reads woff2, so the woff fallbacks fontsource also ships are dropped
const assets = join(root, 'dist/assets');
for (const f of readdirSync(assets)) {
  if (f.endsWith('.woff')) rmSync(join(assets, f));
  else if (f.endsWith('.css')) {
    const css = readFileSync(join(assets, f), 'utf8');
    writeFileSync(join(assets, f), css.replace(/,\s*url\([^)]*\.woff\)\s*format\(["']woff["']\)/g, ''));
  }
}

{
  const path = join(root, 'dist/membros/index.html');
  const html = readFileSync(path, 'utf8');
  if (!html.includes('<!--app-->')) throw new Error('dist/membros/index.html: marker <!--app--> not found');
  writeFileSync(path, html.replace('<!--app-->', renderMembers()));
  console.log('prerendered dist/membros/index.html');
}

rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
