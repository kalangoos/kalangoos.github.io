// The members area's routes live in the hash (#/docs/…, #/spec/…, #/telas/…, #/quadro, #/fora, #/erro): GitHub Pages has no
// rewrites. Pure functions, shared by the page and the unit tests.
import { safeDecode } from './repo.ts';

export type Route =
  | { view: 'docs'; path: string; heading?: string }
  | { view: 'spec'; kind: 's' | 'c'; id: string; tab?: string }
  | { view: 'screens'; path?: string }
  | { view: 'board' }
  | { view: 'outside'; login: string }
  | { view: 'error' };

export const DEFAULT_DOC = 'README.md';

/** GitHub's login charset: letters, digits and hyphens, up to 39 characters. Anything else is never shown. */
export function validLogin(s: string | null | undefined): string {
  return s && /^[A-Za-z0-9-]{1,39}$/.test(s) ? s : '';
}

export function parseRoute(hash: string): Route {
  // a malformed escape ("#/%") must not throw: the text is used as it is
  const h = safeDecode(hash.replace(/^#/, ''));
  const [path = '', query = ''] = h.split('?') as [string, string?];
  const q = new URLSearchParams(query);
  // the "outside" page names the account only when it looks like a GitHub login: the address is attacker-writable
  if (path.startsWith('/fora')) return { view: 'outside', login: validLogin(q.get('login')) };
  if (path.startsWith('/erro')) return { view: 'error' };
  if (path.startsWith('/quadro')) return { view: 'board' };
  const screens = /^\/telas(?:\/(.+))?$/.exec(path);
  if (screens) {
    const raw = screens[1];
    if (!raw) return { view: 'screens' };
    // decode each segment; a bad escape keeps the raw piece (never throws)
    const decoded = raw
      .split('/')
      .map((p) => {
        try {
          return decodeURIComponent(p);
        } catch {
          return p;
        }
      })
      .join('/');
    return { view: 'screens', path: decoded };
  }
  const spec = /^\/spec\/([sc])\/([^/]+(?:\/[^/]+)*?)(?:\/(proposta|design|tarefas|specs))?$/.exec(path);
  if (spec) return { view: 'spec', kind: spec[1] as 's' | 'c', id: spec[2]!, tab: spec[3] };
  if (path.startsWith('/spec')) return { view: 'spec', kind: 'c', id: '' };
  const doc = /^\/docs\/(.+)$/.exec(path);
  return { view: 'docs', path: doc ? doc[1]! : DEFAULT_DOC, heading: q.get('h') ?? undefined };
}
