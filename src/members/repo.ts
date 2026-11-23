// The public repository kalangoos/kalangoos as the members area reads it: the file tree (one GitHub API call,
// unauthenticated), the files (raw.githubusercontent.com, which allows any origin), the docs catalogue and the
// OpenSpec changes. The parsing functions are pure (tests/repo.test.ts).

import { REPO } from './constants.ts';

export const BRANCH = 'main';
export const RAW = `https://raw.githubusercontent.com/${REPO}/${BRANCH}/`;
export const BLOB = `https://github.com/${REPO}/blob/${BRANCH}/`;
export const TREE = `https://github.com/${REPO}/tree/${BRANCH}/`;

// ------------------------------------------------------------------ fetching (cached for the page's life)

const cache = new Map<string, Promise<string>>();
const TREE_KEY = 'kalangoos-tree';
const TREE_TTL = 10 * 60 * 1000;

/** Every file path of the repository. Kept 10 minutes in sessionStorage: the unauthenticated API allows 60 calls an hour. */
export async function fetchTree(): Promise<string[]> {
  try {
    const kept = JSON.parse(sessionStorage.getItem(TREE_KEY) ?? 'null') as { at: number; paths: string[] } | null;
    if (kept && Date.now() - kept.at < TREE_TTL) return kept.paths;
  } catch {
    /* storage unavailable: fetch again */
  }
  const r = await fetch(`https://api.github.com/repos/${REPO}/git/trees/${BRANCH}?recursive=1`, { headers: { Accept: 'application/vnd.github+json' } });
  if (!r.ok) throw new Error(r.status === 403 || r.status === 429 ? 'rate' : `tree: HTTP ${r.status}`);
  const j = (await r.json()) as { tree: { path: string; type: string }[] };
  const paths = j.tree.filter((x) => x.type === 'blob').map((x) => x.path);
  try {
    sessionStorage.setItem(TREE_KEY, JSON.stringify({ at: Date.now(), paths }));
  } catch {
    /* fine without it */
  }
  return paths;
}

export function fetchFile(path: string): Promise<string> {
  let p = cache.get(path);
  if (!p) {
    p = fetch(RAW + path.split('/').map(encodeURIComponent).join('/')).then((r) => {
      if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
      return r.text();
    });
    p.catch(() => cache.delete(path));
    cache.set(path, p);
  }
  return p;
}

// ------------------------------------------------------------------ docs catalogue

export type DocEntry = { path: string; label: string; group: 'root' | 'docs' };

const ROOT_DOCS: [string, string][] = [
  ['README.md', 'Leia-me'],
  ['AGENTS.md', 'Para agentes (AGENTS.md)'],
  ['CONTRIBUTING.md', 'Como contribuir'],
  ['ROADMAP.md', 'Roteiro'],
  ['SECURITY.md', 'Segurança (SECURITY.md)'],
];
const DOC_LABELS: Record<string, string> = {
  'docs/VISAO.md': 'Visão',
  'docs/ARQUITETURA.md': 'Arquitetura',
  'docs/SEGURANCA.md': 'Segurança',
  'docs/PLANO.md': 'Plano',
  'docs/REQUISITOS.md': 'Requisitos',
  'docs/LANCAMENTO.md': 'Lançamento',
  'docs/LICENCAS.md': 'Licenças',
  'docs/telas.md': 'Telas',
  'docs/README.md': 'Índice de docs/',
};
const DOC_ORDER = Object.keys(DOC_LABELS);

/** The documents the area shows: the root files above, then every docs/*.md (new ones appear by their file name). */
export function docCatalog(paths: string[]): DocEntry[] {
  const have = new Set(paths);
  const root = ROOT_DOCS.filter(([p]) => have.has(p)).map(([path, label]) => ({ path, label, group: 'root' as const }));
  const docs = paths
    .filter((p) => /^docs\/[^/]+\.md$/i.test(p))
    .sort((a, b) => {
      const ia = DOC_ORDER.indexOf(a), ib = DOC_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    })
    .map((path) => ({ path, label: DOC_LABELS[path] ?? path.slice(5, -3).replace(/[-_]/g, ' '), group: 'docs' as const }));
  return [...root, ...docs];
}

// ------------------------------------------------------------------ OpenSpec

export type SpecEntry = { id: string; path: string; label: string };
export type ChangeEntry = { id: string; label: string; files: { proposal?: string; design?: string; tasks?: string; meta?: string }; specs: string[] };

/** Slugs are written without accents in the repository; these are the words that need them back for the titles. */
const ACCENTS: Record<string, string> = {
  fundacoes: 'fundações', aparencia: 'aparência', sessao: 'sessão', configuracoes: 'configurações', dialogos: 'diálogos',
  icones: 'ícones', atualizacao: 'atualização', restauracao: 'restauração', instalacao: 'instalação', seguranca: 'segurança',
  memoria: 'memória', notificacoes: 'notificações', area: 'área', graficos: 'gráficos', grafica: 'gráfica',
  compatibilidade: 'compatibilidade', espacos: 'espaços', permissoes: 'permissões', conectores: 'conectores',
  acessibilidade: 'acessibilidade', especificacao: 'especificação', previa: 'prévia',
};

/** "fase-1-shell" → "Fase 1 · Shell"; "barra-de-comando" → "Barra de comando"; "fase-0-fundacoes" → "Fase 0 · Fundações". */
export function slugTitle(slug: string): string {
  const words = (s: string) => s.split('-').filter(Boolean).map((w) => ACCENTS[w] ?? w);
  const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);
  const m = /^fase-(\d+)-(.+)$/.exec(slug);
  if (m) return `Fase ${m[1]} · ${cap(words(m[2]!).join(' '))}`;
  return cap(words(slug).join(' '));
}

export function specCatalog(paths: string[]): { specs: SpecEntry[]; changes: ChangeEntry[] } {
  const specs = paths
    .map((p) => /^openspec\/specs\/(.+)\/spec\.md$/.exec(p))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ id: m[1]!, path: m[0], label: slugTitle(m[1]!.split('/').at(-1)!) }))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  const byId = new Map<string, ChangeEntry>();
  for (const p of paths) {
    const m = /^openspec\/changes\/([^/]+)\/(.+)$/.exec(p);
    if (!m || m[1] === 'archive') continue;
    const [, id, rest] = m;
    let ch = byId.get(id!);
    if (!ch) byId.set(id!, (ch = { id: id!, label: slugTitle(id!), files: {}, specs: [] }));
    if (rest === 'proposal.md') ch.files.proposal = p;
    else if (rest === 'design.md') ch.files.design = p;
    else if (rest === 'tasks.md') ch.files.tasks = p;
    else if (rest === '.openspec.yaml') ch.files.meta = p;
    else if (/^specs\/.+\/spec\.md$/.test(rest!)) ch.specs.push(p);
  }
  const changes = [...byId.values()].sort((a, b) => a.id.localeCompare(b.id, 'pt-BR', { numeric: true }));
  for (const c of changes) c.specs.sort();
  return { specs, changes };
}

export type Task = { done: boolean; id: string; text: string };
export type TaskGroup = { title: string; tasks: Task[] };

/** tasks.md: "## N. Group" headings and "- [x] 1.2 Text" items (nested items count too). */
export function parseTasks(md: string): TaskGroup[] {
  const groups: TaskGroup[] = [];
  let cur: TaskGroup | null = null;
  for (const line of md.split('\n')) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      groups.push((cur = { title: h[1]!, tasks: [] }));
      continue;
    }
    const t = /^\s*[-*]\s+\[([ xX])\]\s+(?:(\d+(?:\.\d+)*[a-z]?)\s+)?(.*)$/.exec(line);
    if (t) {
      if (!cur) groups.push((cur = { title: '', tasks: [] }));
      cur.tasks.push({ done: t[1] !== ' ', id: t[2] ?? '', text: t[3]!.trim() });
    }
  }
  return groups.filter((g) => g.tasks.length);
}

export function progress(groups: TaskGroup[]): { done: number; total: number } {
  const all = groups.flatMap((g) => g.tasks);
  return { done: all.filter((t) => t.done).length, total: all.length };
}

/** .openspec.yaml is two flat keys (schema, created); no YAML library for that. */
export function parseMeta(yaml: string): { schema?: string; created?: string } {
  const get = (k: string) => new RegExp(`^${k}:\\s*(.+?)\\s*$`, 'm').exec(yaml)?.[1]?.replace(/^["']|["']$/g, '');
  return { schema: get('schema'), created: get('created') };
}

// ------------------------------------------------------------------ links inside the documents

/** Joins a relative link to the directory of the file it is in ("docs/A.md" + "../openspec" → "openspec"). */
export function resolvePath(from: string, href: string): string {
  const parts = from.split('/').slice(0, -1);
  for (const seg of href.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.' && seg !== '') parts.push(seg);
  }
  return parts.join('/');
}

export type LinkTarget = { kind: 'doc' | 'spec' | 'change' | 'anchor' | 'external'; href: string };

/**
 * Where a link in a document goes: another document or spec of the area (inside the page), a heading of the same
 * document, or GitHub (files the area does not show, folders) and the open web.
 */
export function linkTarget(from: string, href: string, docs: Set<string>): LinkTarget {
  if (href.startsWith('#')) return { kind: 'anchor', href: href.slice(1) };
  // only web and mail links leave the page; any other scheme (javascript:, data:…) loses its link
  if (/^[a-z][a-z0-9+.-]*:/i.test(href)) return { kind: 'external', href: /^(https?|mailto):/i.test(href) ? href : '' };
  if (href.startsWith('//')) return { kind: 'external', href: `https:${href}` };
  const [pathPart, anchor] = href.split('#') as [string, string | undefined];
  const path = resolvePath(from, safeDecode(pathPart));
  if (docs.has(path)) return { kind: 'doc', href: `#/docs/${path}${anchor ? `?h=${anchor}` : ''}` };
  const spec = /^openspec\/specs\/(.+)\/spec\.md$/.exec(path);
  if (spec) return { kind: 'spec', href: `#/spec/s/${spec[1]}` };
  const change = /^openspec\/changes\/([^/]+)(?:\/.*)?$/.exec(path);
  if (change && change[1] !== 'archive') return { kind: 'change', href: `#/spec/c/${change[1]}` };
  const isFile = /\.[a-z0-9]+$/i.test(path);
  return { kind: 'external', href: (isFile ? BLOB : TREE) + path + (anchor ? `#${anchor}` : '') };
}

/** decodeURIComponent that keeps the text as it is when the escape is malformed ("%E0%A4%A"), instead of throwing. */
export function safeDecode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Hosts an image of a document may come from: the repository's own files and GitHub's image proxy. Anything else
 *  would be a tracking pixel that tells a third party who reads the documents. */
export const IMAGE_HOSTS = ['raw.githubusercontent.com', 'github.com', 'camo.githubusercontent.com'];

/** Image sources relative to the document: served from raw.githubusercontent.com. Absolute ones only from IMAGE_HOSTS. */
export function imageSrc(from: string, src: string): string {
  const abs = src.startsWith('//') ? `https:${src}` : src;
  if (/^[a-z][a-z0-9+.-]*:/i.test(abs)) {
    try {
      const u = new URL(abs);
      return u.protocol === 'https:' && !u.username && !u.password && IMAGE_HOSTS.includes(u.hostname) ? abs : '';
    } catch {
      return '';
    }
  }
  return RAW + resolvePath(from, src);
}

// ------------------------------------------------------------------ headings and search

/** GitHub-like heading ids: lower case, accents kept, punctuation dropped, spaces to hyphens. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

export const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export type SearchHit = { path: string; line: number; snippet: string; at: number; length: number };

/** Every line that has all the words (accents ignored), with a short snippet around the first one. */
export function searchText(path: string, text: string, query: string, max = 5): SearchHit[] {
  const words = fold(query).split(/\s+/).filter((w) => w.length > 1);
  if (!words.length) return [];
  const hits: SearchHit[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length && hits.length < max; i++) {
    const raw = lines[i]!.replace(/[#*`|>_[\]]/g, ' ').replace(/\s+/g, ' ').trim();
    const f = fold(raw);
    if (!words.every((w) => f.includes(w))) continue;
    const pos = f.indexOf(words[0]!);
    const start = Math.max(0, pos - 40);
    const snippet = (start ? '…' : '') + raw.slice(start, start + 140) + (start + 140 < raw.length ? '…' : '');
    hits.push({ path, line: i + 1, snippet, at: pos - start + (start ? 1 : 0), length: words[0]!.length });
  }
  return hits;
}

export function readingMinutes(md: string): number {
  return Math.max(1, Math.round(md.split(/\s+/).filter(Boolean).length / 200));
}
