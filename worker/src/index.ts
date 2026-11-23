// Login service of kalangoos.com (Cloudflare Worker on auth.kalangoos.com). See worker/README.md for the design and
// worker/SETUP.md for what has to be created before it runs. No secret lives in this repository.
//
//   GET  /login     → GitHub's authorize page (state + PKCE kept in a sealed, short-lived cookie)
//   GET  /callback  → exchanges the code, keeps the session only for active members of the organisation
//   GET  /session   → who is signed in (membership checked again on every call)
//   GET  /project   → the organisation's GitHub Project (v2), fixed GraphQL queries only
//   POST /logout    → revokes the token and clears the session

import { LATEST_OPEN_PROJECT, PROJECT_BY_NUMBER } from './project-query.ts';
import { cookie, open, pkceChallenge, randomToken, readCookie, sameString, seal } from './session.ts';

export interface Env {
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string; // secret
  SESSION_KEY: string; // secret: 32 random bytes, base64url
  ORG: string; // kalangoos
  SITE_ORIGIN: string; // https://kalangoos.com
  AUTH_ORIGIN: string; // https://auth.kalangoos.com
  PROJECT_NUMBER?: string; // optional: which organisation project the board shows
}

export const OAUTH_COOKIE = '__Host-kos_oauth';
export const SESSION_COOKIE = '__Host-kos_session';
const OAUTH_TTL = 10 * 60;
const SESSION_TTL = 8 * 60 * 60;
// read:org: see the person's membership of the organisation; read:project: read the organisation's projects
export const SCOPES = 'read:org read:project';
const MEMBERS_PATH = '/membros/';
const MEMBERS_PATH_EN = '/en/members/';
const MAX_PAGES = 5; // 500 project items

type OAuthState = { state: string; verifier: string; next: string };
type Session = { token: string; login: string; name: string | null; avatarUrl: string };
type Fetch = typeof fetch;

export default {
  fetch: (req: Request, env: Env) => handle(req, env, fetch),
};

export async function handle(req: Request, env: Env, gh: Fetch): Promise<Response> {
  const url = new URL(req.url);
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSION_KEY) return json({ error: 'not configured' }, 503);
  try {
    if (req.method === 'OPTIONS') return preflight(req, env);
    if (req.method === 'GET' && url.pathname === '/login') return await login(url, env);
    if (req.method === 'GET' && url.pathname === '/callback') return await callback(req, url, env, gh);
    if (req.method === 'GET' && url.pathname === '/session') return await session(req, env, gh);
    if (req.method === 'GET' && url.pathname === '/project') return await project(req, env, gh);
    if (req.method === 'POST' && url.pathname === '/logout') return await logout(req, env, gh);
    return json({ error: 'not found' }, 404);
  } catch (e) {
    console.error('kalangoos-auth', logSafe((e as Error).message));
    return json({ error: 'internal' }, 500);
  }
}

// ------------------------------------------------------------------ helpers

function baseHeaders(h: Headers = new Headers()): Headers {
  h.set('Cache-Control', 'no-store');
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('Referrer-Policy', 'no-referrer');
  h.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  return h;
}

function json(body: unknown, status = 200, extra?: Headers): Response {
  const h = baseHeaders(extra);
  h.set('Content-Type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(body), { status, headers: h });
}

function redirect(to: string, cookies: string[] = []): Response {
  const h = baseHeaders();
  h.set('Location', to);
  for (const c of cookies) h.append('Set-Cookie', c);
  return new Response(null, { status: 302, headers: h });
}

/**
 * Calls from the page must come from the site itself: the Origin header is checked (it is also what makes the
 * session cookie useless to other sites, on top of SameSite=Strict) and echoed back for CORS with credentials.
 */
function corsFor(req: Request, env: Env): Headers | null {
  if (req.headers.get('Origin') !== env.SITE_ORIGIN) return null;
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', env.SITE_ORIGIN);
  h.set('Access-Control-Allow-Credentials', 'true');
  h.set('Vary', 'Origin');
  return h;
}

function preflight(req: Request, env: Env): Response {
  const h = corsFor(req, env);
  if (!h) return json({ error: 'origin' }, 403);
  h.set('Access-Control-Allow-Methods', 'GET, POST');
  h.set('Access-Control-Max-Age', '600');
  return new Response(null, { status: 204, headers: baseHeaders(h) });
}

const clearSession = () => cookie(SESSION_COOKIE, '', 0, 'Strict');

/**
 * Only the members area's own pages are allowed after signing in (no open redirect): a fixed prefix, then a short
 * whitelist of path characters (no backslash, no percent escapes such as %0d or %2e, no query), no "." / ".." segment,
 * and at most a plain fragment (#/docs/...).
 */
export function safeNext(next: string | null): string {
  if (!next) return MEMBERS_PATH;
  const [path = '', ...frag] = next.split('#');
  const ok =
    (path.startsWith(MEMBERS_PATH) || path.startsWith(MEMBERS_PATH_EN)) &&
    /^\/[A-Za-z0-9._~\/-]*$/.test(path) &&
    !path.includes('//') &&
    !/(^|\/)\.\.?(\/|$)/.test(path) &&
    (frag.length === 0 || (frag.length === 1 && /^[A-Za-z0-9._~\/?=&-]*$/.test(frag[0]!)));
  return ok ? next : MEMBERS_PATH;
}

/** What goes into the logs from outside input: a short, plain-text slice (no URLs, no control characters). */
export function logSafe(v: unknown): string {
  return String(v ?? '').replace(/[^A-Za-z0-9 _.:-]/g, '?').slice(0, 60);
}

function ghHeaders(token?: string): Headers {
  const h = new Headers({ Accept: 'application/vnd.github+json', 'User-Agent': 'kalangoos-auth', 'X-GitHub-Api-Version': '2022-11-28' });
  if (token) h.set('Authorization', `Bearer ${token}`);
  return h;
}

/**
 * - member: active member of the organisation
 * - not-member: GitHub answered that the person is not (404) or only invited
 * - expired: the token is no longer valid (401)
 * - unavailable: GitHub could not answer (403 from SAML SSO or a blocked app, 429 / secondary rate limit, 5xx, network):
 *   nothing is known about the person, so nobody is signed out or revoked because of it
 */
export type Membership = 'member' | 'not-member' | 'expired' | 'unavailable';

async function isMember(gh: Fetch, env: Env, token: string): Promise<Membership> {
  let r: Response;
  try {
    r = await gh(`https://api.github.com/user/memberships/orgs/${encodeURIComponent(env.ORG)}`, { headers: ghHeaders(token) });
  } catch {
    return 'unavailable';
  }
  if (r.status === 401) return 'expired';
  if (r.status === 404) return 'not-member';
  if (r.status !== 200) return 'unavailable';
  const m = (await r.json().catch(() => ({}))) as { state?: string };
  return m.state === 'active' ? 'member' : 'not-member';
}

async function revoke(gh: Fetch, env: Env, token: string): Promise<void> {
  const h = ghHeaders();
  h.set('Authorization', `Basic ${btoa(`${env.GITHUB_CLIENT_ID}:${env.GITHUB_CLIENT_SECRET}`)}`);
  h.set('Content-Type', 'application/json');
  await gh(`https://api.github.com/applications/${encodeURIComponent(env.GITHUB_CLIENT_ID)}/token`, {
    method: 'DELETE',
    headers: h,
    body: JSON.stringify({ access_token: token }),
  }).catch(() => undefined);
}

async function currentSession(req: Request, env: Env): Promise<Session | null> {
  return open<Session>(env.SESSION_KEY, 'session', readCookie(req, SESSION_COOKIE));
}

// ------------------------------------------------------------------ routes

async function login(url: URL, env: Env): Promise<Response> {
  const state = randomToken();
  const verifier = randomToken(48);
  const sealed = await seal(env.SESSION_KEY, 'oauth', { state, verifier, next: safeNext(url.searchParams.get('next')) } satisfies OAuthState, OAUTH_TTL);
  const q = new URLSearchParams({
    client_id: env.GITHUB_CLIENT_ID,
    redirect_uri: `${env.AUTH_ORIGIN}/callback`,
    scope: SCOPES,
    state,
    code_challenge: await pkceChallenge(verifier),
    code_challenge_method: 'S256',
    allow_signup: 'false',
  });
  if (url.searchParams.get('switch') === '1') q.set('prompt', 'select_account');
  // SameSite=Lax: the cookie has to come back on the top-level navigation from github.com to /callback
  return redirect(`https://github.com/login/oauth/authorize?${q}`, [cookie(OAUTH_COOKIE, sealed, OAUTH_TTL, 'Lax')]);
}

async function callback(req: Request, url: URL, env: Env, gh: Fetch): Promise<Response> {
  const st = await open<OAuthState>(env.SESSION_KEY, 'oauth', readCookie(req, OAUTH_COOKIE));
  const back = (st?.next ?? MEMBERS_PATH).split('#')[0]!; // the language the person started from
  const fail = (why: string) => {
    console.warn('kalangoos-auth callback:', logSafe(why));
    return redirect(`${env.SITE_ORIGIN}${back}#/erro`, [cookie(OAUTH_COOKIE, '', 0, 'Lax')]);
  };
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') ?? '';
  if (!st) return fail('no or expired login state');
  if (!sameString(state, st.state)) return fail('state mismatch');
  if (!code) return fail(url.searchParams.get('error') ?? 'no code');

  let r: Response;
  try {
    r = await gh('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'kalangoos-auth' },
      body: new URLSearchParams({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: `${env.AUTH_ORIGIN}/callback`,
        code_verifier: st.verifier,
      }),
    });
  } catch {
    return fail('token exchange: network'); // GitHub unreachable: the error page, not a raw 500
  }
  const tok = (await r.json().catch(() => ({}))) as { access_token?: string; error?: string };
  if (!tok.access_token) return fail(`token exchange: ${tok.error ?? r.status}`);
  const token = tok.access_token;

  // from here a token exists: whatever goes wrong, it is revoked and nothing is kept
  let user: { login: string; name: string | null; avatar_url: string };
  try {
    const ur = await gh('https://api.github.com/user', { headers: ghHeaders(token) });
    if (!ur.ok) {
      await revoke(gh, env, token);
      return fail(`user: ${ur.status}`);
    }
    user = (await ur.json()) as typeof user;
    if (typeof user?.login !== 'string') throw new Error('no login');
  } catch {
    await revoke(gh, env, token);
    return fail('user: network or bad answer');
  }

  const membership = await isMember(gh, env, token);
  if (membership !== 'member') {
    // nothing is kept: the token is revoked right away. Only a definite "not a member" says so; when GitHub could not
    // answer (SAML SSO, rate limit, outage) the person is told to try again, not that they are outside.
    await revoke(gh, env, token);
    if (membership !== 'not-member') return fail(`membership ${membership}`);
    return redirect(`${env.SITE_ORIGIN}${back}#/fora?login=${encodeURIComponent(user.login)}`, [cookie(OAUTH_COOKIE, '', 0, 'Lax')]);
  }

  const s = await seal(env.SESSION_KEY, 'session', { token, login: user.login, name: user.name, avatarUrl: user.avatar_url } satisfies Session, SESSION_TTL);
  return redirect(`${env.SITE_ORIGIN}${st.next}`, [cookie(OAUTH_COOKIE, '', 0, 'Lax'), cookie(SESSION_COOKIE, s, SESSION_TTL, 'Strict')]);
}

async function session(req: Request, env: Env, gh: Fetch): Promise<Response> {
  const cors = corsFor(req, env);
  if (!cors) return json({ error: 'origin' }, 403);
  const s = await currentSession(req, env);
  if (!s) return json({ error: 'no session' }, 401, cors);
  const member = await isMember(gh, env, s.token);
  // GitHub could not answer: keep the cookie (the person is still a member) and let the page retry
  if (member === 'unavailable') return json({ error: 'unavailable' }, 503, cors);
  if (member !== 'member') {
    cors.append('Set-Cookie', clearSession());
    return json({ error: member === 'expired' ? 'expired' : 'not a member' }, 401, cors);
  }
  return json({ login: s.login, name: s.name, avatarUrl: s.avatarUrl }, 200, cors);
}

type Page = {
  data?: { organization?: { viewerIsAMember?: boolean; projectV2?: ProjectNode | null; projectsV2?: { nodes: ProjectNode[] } } | null };
  errors?: { type?: string; message: string }[];
};
type ProjectNode = { items: { nodes: unknown[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } } } & Record<string, unknown>;

async function project(req: Request, env: Env, gh: Fetch): Promise<Response> {
  const cors = corsFor(req, env);
  if (!cors) return json({ error: 'origin' }, 403);
  const s = await currentSession(req, env);
  if (!s) return json({ error: 'no session' }, 401, cors);

  const number = env.PROJECT_NUMBER ? Number(env.PROJECT_NUMBER) : null;
  const query = number ? PROJECT_BY_NUMBER : LATEST_OPEN_PROJECT;
  let first: Page | null = null;
  let node: ProjectNode | null = null;
  let after: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const r = await gh('https://api.github.com/graphql', {
      method: 'POST',
      headers: ghHeaders(s.token),
      body: JSON.stringify({ query, variables: { org: env.ORG, after, ...(number ? { number } : {}) } }),
    });
    if (r.status === 401) {
      cors.append('Set-Cookie', clearSession());
      return json({ error: 'expired' }, 401, cors);
    }
    if (r.status === 403 || r.status === 429 || r.status >= 500) return json({ error: 'unavailable' }, 503, cors);
    const j = (await r.json().catch(() => ({ errors: [{ message: 'bad json' }] }))) as Page;
    if (j.errors?.length && !j.data?.organization) return json({ error: 'github', detail: j.errors.map((e) => e.type ?? e.message) }, 502, cors);
    const org = j.data?.organization;
    if (!org?.viewerIsAMember) {
      cors.append('Set-Cookie', clearSession());
      return json({ error: 'not a member' }, 403, cors);
    }
    const p = org.projectV2 ?? org.projectsV2?.nodes[0] ?? null;
    if (!first) {
      first = j;
      node = p;
    } else if (p && node) {
      node.items.nodes.push(...p.items.nodes);
      node.items.pageInfo = p.items.pageInfo;
    }
    if (!p || !p.items.pageInfo.hasNextPage) break;
    after = p.items.pageInfo.endCursor;
  }
  return json(first?.data ?? null, 200, cors);
}

async function logout(req: Request, env: Env, gh: Fetch): Promise<Response> {
  const cors = corsFor(req, env);
  if (!cors) return json({ error: 'origin' }, 403);
  const s = await currentSession(req, env);
  if (s) await revoke(gh, env, s.token);
  cors.append('Set-Cookie', clearSession());
  return new Response(null, { status: 204, headers: baseHeaders(cors) });
}
