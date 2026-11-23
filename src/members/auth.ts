// The members area talks to the login service (worker/), which keeps the GitHub token in its own httpOnly cookie on
// auth.kalangoos.com. The page never sees the token: it only asks who is signed in and for the board's data.

/** Set at build time (VITE_AUTH_URL). Empty while the Worker does not exist: the area shows "not connected". */
export const AUTH_URL: string = (import.meta.env.VITE_AUTH_URL ?? '').trim().replace(/\/+$/, '');

/**
 * Local preview of the members area without a session (VITE_MEMBERS_PREVIEW=1, never set by the CI build). It only
 * opens the public parts (docs and spec from the public repository); the board stays empty, nothing is invented.
 */
export const MEMBERS_PREVIEW: boolean = import.meta.env.VITE_MEMBERS_PREVIEW === '1';

export { ORG, REPO } from './constants';
import type { Lang } from '../content';
import { pathOf } from '../lib/routes';

export type Session = { login: string; name: string | null; avatarUrl: string };

/** Who is signed in, or null (no session, or not a member). Throws when the service or GitHub cannot answer (503, network):
 *  the person may well still be signed in, so the page must not say they are not. */
export async function fetchSession(signal?: AbortSignal): Promise<Session | null> {
  if (!AUTH_URL) return null;
  const r = await fetch(`${AUTH_URL}/session`, { credentials: 'include', signal, cache: 'no-store' });
  if (r.status === 401 || r.status === 403) return null;
  if (!r.ok) throw new Error(`session: HTTP ${r.status}`);
  const s = (await r.json()) as Partial<Session>;
  return s.login ? { login: s.login, name: s.name ?? null, avatarUrl: s.avatarUrl ?? '' } : null;
}

/** Starts the GitHub sign-in at the Worker; `switchAccount` asks GitHub to let the person pick another account. */
export function loginUrl(lang: Lang, switchAccount = false): string {
  const q = new URLSearchParams({ next: pathOf(lang, 'members') });
  if (switchAccount) q.set('switch', '1');
  return `${AUTH_URL}/login?${q}`;
}

export async function signOut(): Promise<void> {
  if (!AUTH_URL) return;
  await fetch(`${AUTH_URL}/logout`, { method: 'POST', credentials: 'include' }).catch(() => undefined);
}

/** The organisation's project (GraphQL data, every page of items joined) through the Worker, with the session. */
export async function fetchProject(signal?: AbortSignal): Promise<unknown> {
  const r = await fetch(`${AUTH_URL}/project`, { credentials: 'include', signal, cache: 'no-store' });
  if (r.status === 401 || r.status === 403) throw Object.assign(new Error('no session'), { code: 'session' });
  if (!r.ok) throw new Error(`project: HTTP ${r.status}`);
  return r.json();
}
