// Login Worker (worker/src): sealed cookies, the OAuth flow's checks and who gets a session. GitHub's HTTP API is
// replaced by a small stub that answers like the real endpoints, so the Worker's decisions can be checked offline;
// the GitHub side itself is exercised for real only after SETUP.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handle, safeNext, OAUTH_COOKIE, SESSION_COOKIE, type Env } from '../worker/src/index.ts';
import { b64url, open, seal } from '../worker/src/session.ts';

const env: Env = {
  GITHUB_CLIENT_ID: 'Iv1.exemplo',
  GITHUB_CLIENT_SECRET: 'segredo-de-teste',
  SESSION_KEY: b64url(new Uint8Array(32).fill(7)),
  ORG: 'kalangoos',
  SITE_ORIGIN: 'https://kalangoos.com',
  AUTH_ORIGIN: 'https://auth.kalangoos.com',
};
const SITE = { Origin: 'https://kalangoos.com' };

/** GitHub stub: `membership` is what /user/memberships/orgs/kalangoos answers. */
function github(membership: number | { state: string }) {
  const calls: { url: string; method: string; body?: string }[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? String(init.body) : undefined });
    if (url === 'https://github.com/login/oauth/access_token') return Response.json({ access_token: 'gho_teste', scope: 'read:org,read:project' });
    if (url === 'https://api.github.com/user') return Response.json({ login: 'lia-souza', name: 'Lia Souza', avatar_url: 'https://avatars.githubusercontent.com/u/2' });
    if (url.startsWith('https://api.github.com/user/memberships/orgs/'))
      return typeof membership === 'number' ? new Response('{}', { status: membership }) : Response.json(membership);
    if (url.includes('/applications/')) return new Response(null, { status: 204 });
    return new Response('{}', { status: 404 });
  }) as typeof fetch;
  return { f, calls };
}

const cookieOf = (r: Response, name: string) =>
  r.headers.getSetCookie().find((c) => c.startsWith(`${name}=`));

async function startLogin() {
  const r = await handle(new Request('https://auth.kalangoos.com/login?next=/membros/%23/quadro'), env, github(404).f);
  const loc = new URL(r.headers.get('Location')!);
  const c = cookieOf(r, OAUTH_COOKIE)!;
  return { r, loc, cookie: c.split(';')[0]!, raw: c };
}

test('sealed values open only with the same purpose, unaltered and before they expire', async () => {
  const s = await seal(env.SESSION_KEY, 'session', { login: 'x' }, 60);
  assert.equal((await open<{ login: string }>(env.SESSION_KEY, 'session', s))!.login, 'x');
  assert.equal(await open(env.SESSION_KEY, 'oauth', s), null);
  assert.equal(await open(env.SESSION_KEY, 'session', s.slice(0, -2) + (s.endsWith('A') ? 'BB' : 'AA')), null);
  assert.equal(await open(env.SESSION_KEY, 'session', await seal(env.SESSION_KEY, 'session', {}, -1)), null);
});

test('/login sends to GitHub with minimal scopes, state and PKCE, in a Lax __Host- cookie', async () => {
  const { r, loc, raw } = await startLogin();
  assert.equal(r.status, 302);
  assert.equal(loc.origin + loc.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(loc.searchParams.get('scope'), 'read:org read:project');
  assert.equal(loc.searchParams.get('redirect_uri'), 'https://auth.kalangoos.com/callback');
  assert.equal(loc.searchParams.get('code_challenge_method'), 'S256');
  assert.ok((loc.searchParams.get('state') ?? '').length >= 40);
  assert.match(raw, /^__Host-kos_oauth=[^;]+; Path=\/; Secure; HttpOnly; SameSite=Lax; Max-Age=600$/);
  assert.ok(!raw.includes(loc.searchParams.get('state')!), 'the state travels sealed, not in clear');
});

test('a member gets an 8-hour Strict session and goes back to the members area', async () => {
  const { loc, cookie } = await startLogin();
  const gh = github({ state: 'active' });
  const r = await handle(new Request(`https://auth.kalangoos.com/callback?code=abc&state=${loc.searchParams.get('state')}`, { headers: { Cookie: cookie } }), env, gh.f);
  assert.equal(r.headers.get('Location'), 'https://kalangoos.com/membros/#/quadro');
  const s = cookieOf(r, SESSION_COOKIE)!;
  assert.match(s, /; Path=\/; Secure; HttpOnly; SameSite=Strict; Max-Age=28800$/);
  const exchange = gh.calls.find((c) => c.url.endsWith('/access_token'))!;
  assert.match(exchange.body!, /code_verifier=/);
  // the session answers the site, and only the site
  const sess = s.split(';')[0]!;
  const ok = await handle(new Request('https://auth.kalangoos.com/session', { headers: { ...SITE, Cookie: sess } }), env, gh.f);
  assert.deepEqual(await ok.json(), { login: 'lia-souza', name: 'Lia Souza', avatarUrl: 'https://avatars.githubusercontent.com/u/2' });
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://kalangoos.com');
  assert.equal(ok.headers.get('Access-Control-Allow-Credentials'), 'true');
  const evil = await handle(new Request('https://auth.kalangoos.com/session', { headers: { Origin: 'https://evil.example', Cookie: sess } }), env, gh.f);
  assert.equal(evil.status, 403);
  assert.equal(evil.headers.get('Access-Control-Allow-Origin'), null);
});

test('someone outside the organisation gets no session, the token is revoked, and the friendly page', async () => {
  for (const membership of [404, { state: 'pending' }] as const) {
    const { loc, cookie } = await startLogin();
    const gh = github(membership);
    const r = await handle(new Request(`https://auth.kalangoos.com/callback?code=abc&state=${loc.searchParams.get('state')}`, { headers: { Cookie: cookie } }), env, gh.f);
    assert.equal(r.headers.get('Location'), 'https://kalangoos.com/membros/#/fora?login=lia-souza');
    assert.equal(cookieOf(r, SESSION_COOKIE), undefined);
    assert.ok(gh.calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/applications/Iv1.exemplo/token')));
  }
});

test('a wrong or missing state never reaches GitHub', async () => {
  const { cookie } = await startLogin();
  const gh = github({ state: 'active' });
  const r = await handle(new Request('https://auth.kalangoos.com/callback?code=abc&state=outro', { headers: { Cookie: cookie } }), env, gh.f);
  assert.equal(r.headers.get('Location'), 'https://kalangoos.com/membros/#/erro');
  const r2 = await handle(new Request('https://auth.kalangoos.com/callback?code=abc&state=x'), env, gh.f);
  assert.equal(r2.headers.get('Location'), 'https://kalangoos.com/membros/#/erro');
  assert.equal(gh.calls.length, 0);
});

test('a session whose owner left the organisation is dropped at the next check', async () => {
  const sess = `${SESSION_COOKIE}=${await seal(env.SESSION_KEY, 'session', { token: 't', login: 'lia-souza', name: null, avatarUrl: '' }, 60)}`;
  const r = await handle(new Request('https://auth.kalangoos.com/session', { headers: { ...SITE, Cookie: sess } }), env, github(404).f);
  assert.equal(r.status, 401);
  assert.match(cookieOf(r, SESSION_COOKIE)!, /Max-Age=0/);
});

test('only paths of the members area are accepted after signing in; unconfigured Worker refuses', async () => {
  assert.equal(safeNext('/membros/#/docs/README.md'), '/membros/#/docs/README.md');
  for (const bad of ['https://evil.example', '//evil.example', '/membros//evil', '/outra', null]) assert.equal(safeNext(bad), '/membros/');
  const r = await handle(new Request('https://auth.kalangoos.com/login'), { ...env, GITHUB_CLIENT_SECRET: '' }, github(404).f);
  assert.equal(r.status, 503);
});
