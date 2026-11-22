// After `vite build` (client) and `vite build --ssr` (server entry): writes the rendered HTML of every page and
// language (dist/<path>/index.html, dist/404.html), plus sitemap.xml, so dist/ works as plain static files and the
// text is there without JavaScript. The two Vite pages (dist/index.html, dist/en/index.html) are the templates.
import { readFileSync, writeFileSync, rmSync, mkdirSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadEnv } from 'vite';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { render } = await import(pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href);
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
// The members page (/membros/, /en/members/) is not for search engines: noindex, no canonical or hreflang, not in the
// sitemap. It may be signed in, so it also gets a Content-Security-Policy (see csp()).
const HIDDEN = new Set(['notfound', 'members']);
const AUTH_ORIGIN = 'https://auth.kalangoos.com';
{
  // the login service address enters the build only as VITE_AUTH_URL (process env or .env.production): it has to be the
  // one origin the CSP lets the page talk to, and it is never a secret (nothing else is read from the environment here)
  const url = (loadEnv('production', root, 'VITE_').VITE_AUTH_URL ?? '').trim().replace(/\/+$/, '');
  if (url && url !== AUTH_ORIGIN) throw new Error(`VITE_AUTH_URL is "${url}", expected empty (login off) or ${AUTH_ORIGIN}`);
}
const OG_LOCALE = { 'pt-BR': 'pt_BR', en: 'en_US' };

function head(lang, page) {
  const c = content[lang];
  const m = page === 'home' ? c.meta : page === 'members' ? c.members : c.pages[page];
  const url = origin + routes.pages[page][lang];
  const lines = [`<meta name="description" content="${esc(m.description)}" />`];
  if (page === 'members') {
    lines.push('<meta name="robots" content="noindex, nofollow" />'); // no canonical, no alternates, no social card
    return { title: m.title, tags: lines.join('\n    ') };
  }
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

/**
 * CSP for the members page, as a <meta> (GitHub Pages cannot send headers). Scripts: this site's bundle and the one
 * inline script of the template, by hash. Network: only the login service and GitHub (repository files, API); images:
 * the site, the repository's files, GitHub's image proxy and avatars. Fonts and styles: this site only (the fonts are
 * the @fontsource copies), so no visitor address goes to a third party.
 */
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

const written = [];
for (const page of Object.keys(routes.pages)) {
  if (page === 'notfound') continue;
  for (const lang of ['pt-BR', 'en']) { write(lang, page); written.push(page); }
}
write('pt-BR', 'notfound'); // GitHub Pages serves /404.html for every unknown address

const urls = Object.keys(routes.pages)
  .filter((p) => !HIDDEN.has(p))
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
rmSync(join(root, 'dist-ssr'), { recursive: true, force: true });
