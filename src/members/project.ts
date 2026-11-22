// Maps the GitHub Projects (v2) GraphQL response the Worker returns (worker/src/project-query.ts) to the board the
// members area draws. Pure functions only: tests/project.test.ts runs them on a sample response.

export type BoardPerson = { login: string; avatarUrl: string };
export type BoardLabel = { name: string; color: string };
export type BoardLink = { kind: 'issue' | 'pr'; number: number; url: string; repo: string };
export type BoardItem = {
  id: string;
  kind: 'issue' | 'pr' | 'draft' | 'redacted';
  title: string;
  number: number | null;
  url: string | null;
  repo: string | null;
  state: 'open' | 'closed' | 'merged' | 'draft' | null;
  labels: BoardLabel[];
  assignees: BoardPerson[];
  links: BoardLink[];
  status: string | null;
};
export type BoardColumn = { id: string; name: string; color: string; items: BoardItem[] };
export type Board = { number: number; title: string; url: string; updatedAt: string; total: number; columns: BoardColumn[] };

/** The column for items without a Status value. */
export const NO_STATUS = 'Sem status';

type Raw = Record<string, unknown> | null | undefined;
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);
/** Links the board draws come from GitHub's data, but only github.com addresses are ever put in an href (no javascript:, no other hosts). */
export const ghUrl = (v: unknown): string | null => (typeof v === 'string' && /^https:\/\/github\.com\/[^\s]*$/.test(v) ? v : null);
/** A label colour is six hex digits; anything else would reach a CSS value. */
export const labelColor = (v: unknown): string => (typeof v === 'string' && /^#?[0-9a-f]{6}$/i.test(v) ? v.replace(/^#/, '') : '8E8F99');
/** Avatars: only GitHub's own host (the page's CSP agrees). */
export const avatarOf = (v: unknown): string => (typeof v === 'string' && /^https:\/\/avatars\.githubusercontent\.com\//.test(v) ? v : '');
const nodes = (v: unknown): unknown[] => arr(obj(v).nodes);

const people = (v: unknown): BoardPerson[] =>
  nodes(v)
    .map(obj)
    .filter((p) => str(p.login))
    .map((p) => ({ login: str(p.login)!, avatarUrl: avatarOf(p.avatarUrl) }));

const labels = (v: unknown): BoardLabel[] =>
  nodes(v)
    .map(obj)
    .filter((l) => str(l.name))
    .map((l) => ({ name: str(l.name)!, color: labelColor(l.color) }));

const links = (v: unknown, kind: BoardLink['kind']): BoardLink[] =>
  nodes(v)
    .map(obj)
    .filter((l) => num(l.number) !== null && ghUrl(l.url))
    .map((l) => ({ kind, number: num(l.number)!, url: ghUrl(l.url)!, repo: str(obj(l.repository).nameWithOwner) ?? '' }));

/** One project item: an issue, a pull request, a draft, or content the viewer cannot see. */
export function mapItem(raw: unknown): BoardItem | null {
  const it = obj(raw);
  if (it.isArchived === true) return null;
  const content = obj(it.content);
  const status = str(obj(it.fieldValueByName).name);
  const base = { id: str(it.id) ?? '', status, labels: [] as BoardLabel[], assignees: [] as BoardPerson[], links: [] as BoardLink[] };
  switch (content.__typename) {
    case 'Issue':
      return {
        ...base,
        kind: 'issue',
        title: str(content.title) ?? '',
        number: num(content.number),
        url: ghUrl(content.url),
        repo: str(obj(content.repository).nameWithOwner),
        state: content.state === 'CLOSED' ? 'closed' : 'open',
        labels: labels(content.labels),
        assignees: people(content.assignees),
        links: links(content.closedByPullRequestsReferences, 'pr'),
      };
    case 'PullRequest':
      return {
        ...base,
        kind: 'pr',
        title: str(content.title) ?? '',
        number: num(content.number),
        url: ghUrl(content.url),
        repo: str(obj(content.repository).nameWithOwner),
        state: content.state === 'MERGED' ? 'merged' : content.state === 'CLOSED' ? 'closed' : content.isDraft === true ? 'draft' : 'open',
        labels: labels(content.labels),
        assignees: people(content.assignees),
        links: links(content.closingIssuesReferences, 'issue'),
      };
    case 'DraftIssue':
      return { ...base, kind: 'draft', title: str(content.title) ?? '', number: null, url: null, repo: null, state: 'draft', assignees: people(content.assignees) };
    default:
      // REDACTED items (content in a repository the viewer cannot read) keep their place without leaking anything
      return { ...base, kind: 'redacted', title: '', number: null, url: null, repo: null, state: null };
  }
}

/** The project node, whichever query returned it (by number or the latest open one). */
export function pickProject(data: unknown): Raw {
  const org = obj(obj(data).organization);
  if (org.projectV2) return obj(org.projectV2);
  const first = nodes(org.projectsV2)[0];
  return first ? obj(first) : null;
}

/**
 * Columns follow the Status field's options, in the project's order; items without a status go to a first
 * "Sem status" column, shown only when it has items. Items whose status no longer exists as an option get a column
 * of their own at the end, so nothing disappears.
 */
export function mapProject(data: unknown, extraItems: unknown[] = []): Board | null {
  const p = pickProject(data);
  if (!p) return null;
  const options = arr(obj(p.field).options).map(obj);
  const columns: BoardColumn[] = options.map((o) => ({
    id: str(o.id) ?? str(o.name) ?? '',
    name: str(o.name) ?? '',
    color: str(o.color) ?? 'GRAY',
    items: [],
  }));
  const none: BoardColumn = { id: '', name: NO_STATUS, color: 'GRAY', items: [] };
  const items = [...nodes(p.items), ...extraItems].map(mapItem).filter((x): x is BoardItem => x !== null);
  for (const item of items) {
    if (!item.status) {
      none.items.push(item);
      continue;
    }
    let col = columns.find((c) => c.name === item.status);
    if (!col) {
      col = { id: item.status, name: item.status, color: 'GRAY', items: [] };
      columns.push(col);
    }
    col.items.push(item);
  }
  return {
    number: num(p.number) ?? 0,
    title: str(p.title) ?? '',
    url: ghUrl(p.url) ?? '',
    updatedAt: str(p.updatedAt) ?? '',
    total: num(obj(p.items).totalCount) ?? items.length,
    columns: none.items.length ? [none, ...columns] : columns,
  };
}

export type BoardFilter = { text: string; assignee: string; label: string; repo: string; mine: string | null };
export const NO_FILTER: BoardFilter = { text: '', assignee: '', label: '', repo: '', mine: null };

const fold = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();

export function matches(item: BoardItem, f: BoardFilter): boolean {
  if (f.mine && !item.assignees.some((a) => a.login === f.mine)) return false;
  if (f.assignee && !item.assignees.some((a) => a.login === f.assignee)) return false;
  if (f.label && !item.labels.some((l) => l.name === f.label)) return false;
  if (f.repo && item.repo !== f.repo) return false;
  if (f.text) {
    const hay = fold(`${item.title} ${item.repo ?? ''} ${item.number ?? ''} ${item.labels.map((l) => l.name).join(' ')}`);
    if (!fold(f.text).split(/\s+/).filter(Boolean).every((w) => hay.includes(w))) return false;
  }
  return true;
}

/** Values for the filter menus: every assignee, label and repository on the board, sorted. */
export function facets(board: Board) {
  const all = board.columns.flatMap((c) => c.items);
  const uniq = (xs: string[]) => [...new Set(xs)].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return {
    assignees: uniq(all.flatMap((i) => i.assignees.map((a) => a.login))),
    labels: uniq(all.flatMap((i) => i.labels.map((l) => l.name))),
    repos: uniq(all.map((i) => i.repo).filter((r): r is string => !!r)),
  };
}

/** GitHub's single-select colour names → the Design System token that draws the column dot. */
export const STATUS_TOKEN: Record<string, string> = {
  GRAY: 'muted',
  BLUE: 'blue',
  GREEN: 'teal',
  YELLOW: 'gold',
  ORANGE: 'cream',
  RED: 'coral',
  PINK: 'pink',
  PURPLE: 'purple',
};

/** "kalangoos/kalangoos" + 31 → "kalangoos#31" (the organisation's name is implied). */
export function shortRef(repo: string | null, n: number | null, org = 'kalangoos'): string {
  if (!repo || n === null) return '';
  const name = repo.startsWith(`${org}/`) ? repo.slice(org.length + 1) : repo;
  return `${name}#${n}`;
}
