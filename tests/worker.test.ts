// Login Worker (worker/src): sealed cookies, the OAuth flow's checks and who gets a session. GitHub's HTTP API is
// replaced by a small stub that answers like the real endpoints, so the Worker's decisions can be checked offline;
// the GitHub side itself is exercised for real only after SETUP.md.
import { test, mock } from 'node:test';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { handle, safeNext, logSafe, OAUTH_COOKIE, SESSION_COOKIE, type Env } from '../worker/src/index.ts';
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
function github(membership: number | { state: string }, graphql?: () => Response) {
  const calls: { url: string; method: string; body?: string }[] = [];
  const f = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, method: init?.method ?? 'GET', body: init?.body ? String(init.body) : undefined });
    if (url === 'https://github.com/login/oauth/access_token') return Response.json({ access_token: 'gho_teste', scope: 'read:org,read:project' });
    if (url === 'https://api.github.com/user') return Response.json({ login: 'lia-souza', name: 'Lia Souza', avatar_url: 'https://avatars.githubusercontent.com/u/2' });
    if (url.startsWith('https://api.github.com/user/memberships/orgs/'))
      return typeof membership === 'number' ? new Response('{}', { status: membership }) : Response.json(membership);
    if (url === 'https://api.github.com/graphql' && graphql) return graphql();
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

// ------------------------------------------------------------------ authorisation paths (stub-based)

const sealedSession = async (token = 'gho_membro') =>
  `${SESSION_COOKIE}=${await seal(env.SESSION_KEY, 'session', { token, login: 'lia-souza', name: null, avatarUrl: '' }, 60)}`;
const board = (viewerIsAMember: boolean) => () =>
  Response.json({ data: { organization: { viewerIsAMember, projectsV2: { nodes: [{ title: 'Roadmap', items: { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } } }] } } } });
const get = (path: string, headers: Record<string, string> = {}) => new Request(`https://auth.kalangoos.com${path}`, { headers });
const revoked = (calls: { method: string; url: string }[]) => calls.some((c) => c.method === 'DELETE' && c.url.endsWith('/applications/Iv1.exemplo/token'));

test('/project answers 401 without a session and 403 (clearing the cookie) for a non-member', async () => {
  const none = await handle(get('/project', SITE), env, github(200, board(true)).f);
  assert.equal(none.status, 401);
  const gh = github(200, board(false));
  const out = await handle(get('/project', { ...SITE, Cookie: await sealedSession() }), env, gh.f);
  assert.equal(out.status, 403);
  assert.match(cookieOf(out, SESSION_COOKIE)!, /Max-Age=0/);
  // and a member gets the board, with the session's token (never the site's)
  const ok = await handle(get('/project', { ...SITE, Cookie: await sealedSession() }), env, github(200, board(true)).f);
  assert.equal(ok.status, 200);
  assert.equal(((await ok.json()) as { organization: { viewerIsAMember: boolean } }).organization.viewerIsAMember, true);
});

test('CORS: only the site\'s Origin gets the credentialed headers, on /project and /logout; others get 403', async () => {
  const cookie = await sealedSession();
  for (const [method, path] of [['GET', '/project'], ['POST', '/logout']] as const) {
    const mk = (h: Record<string, string>) => new Request(`https://auth.kalangoos.com${path}`, { method, headers: { ...h, Cookie: cookie } });
    const ok = await handle(mk(SITE), env, github(200, board(true)).f);
    assert.ok(ok.status === 200 || ok.status === 204, `${path} ${ok.status}`);
    assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://kalangoos.com');
    assert.equal(ok.headers.get('Access-Control-Allow-Credentials'), 'true');
    assert.equal(ok.headers.get('Vary'), 'Origin');
    for (const h of [{}, { Origin: 'https://evil.example' }, { Origin: 'https://kalangoos.com.evil.example' }, { Origin: 'null' }]) {
      const bad = await handle(mk(h), env, github(200, board(true)).f);
      assert.equal(bad.status, 403, `${path} with ${JSON.stringify(h)}`);
      assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null);
      assert.equal(bad.headers.get('Access-Control-Allow-Credentials'), null);
    }
  }
});

test('OPTIONS preflight: the Origin is checked, only GET and POST are allowed', async () => {
  const pre = (h: Record<string, string>) => handle(new Request('https://auth.kalangoos.com/project', { method: 'OPTIONS', headers: h }), env, github(404).f);
  const ok = await pre(SITE);
  assert.equal(ok.status, 204);
  assert.equal(ok.headers.get('Access-Control-Allow-Origin'), 'https://kalangoos.com');
  assert.equal(ok.headers.get('Access-Control-Allow-Methods'), 'GET, POST');
  for (const h of [{}, { Origin: 'https://evil.example' }]) {
    const bad = await pre(h);
    assert.equal(bad.status, 403);
    assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null);
  }
});

test('/logout revokes the session token and clears the cookie; a foreign Origin does neither', async () => {
  const cookie = await sealedSession('gho_para_revogar');
  const gh = github(200);
  const r = await handle(new Request('https://auth.kalangoos.com/logout', { method: 'POST', headers: { ...SITE, Cookie: cookie } }), env, gh.f);
  assert.equal(r.status, 204);
  assert.match(cookieOf(r, SESSION_COOKIE)!, /Max-Age=0/);
  const del = gh.calls.find((c) => c.method === 'DELETE')!;
  assert.match(del.body!, /gho_para_revogar/);
  const evilGh = github(200);
  const evil = await handle(new Request('https://auth.kalangoos.com/logout', { method: 'POST', headers: { Origin: 'https://evil.example', Cookie: cookie } }), env, evilGh.f);
  assert.equal(evil.status, 403);
  assert.equal(cookieOf(evil, SESSION_COOKIE), undefined);
  assert.equal(evilGh.calls.length, 0, 'no call to GitHub, the token stays');
  // GET is not a logout
  assert.equal((await handle(get('/logout', { ...SITE, Cookie: cookie }), env, github(200).f)).status, 404);
});

test('PKCE: the challenge is the S256 of the verifier that is later sent with the code', async () => {
  const { loc, cookie } = await startLogin();
  const sealedOauth = cookie.split('=')[1]!;
  const st = (await open<{ state: string; verifier: string }>(env.SESSION_KEY, 'oauth', sealedOauth))!;
  const expected = createHash('sha256').update(st.verifier).digest('base64url');
  assert.equal(loc.searchParams.get('code_challenge'), expected);
  assert.ok(st.verifier.length >= 43, 'RFC 7636: at least 43 characters');
  assert.notEqual(loc.searchParams.get('code_challenge'), st.verifier, 'not the plain method');
  const gh = github({ state: 'active' });
  await handle(new Request(`https://auth.kalangoos.com/callback?code=abc&state=${loc.searchParams.get('state')}`, { headers: { Cookie: cookie } }), env, gh.f);
  const sent = new URLSearchParams(gh.calls.find((c) => c.url.endsWith('/access_token'))!.body!);
  assert.equal(sent.get('code_verifier'), st.verifier);
  assert.equal(createHash('sha256').update(sent.get('code_verifier')!).digest('base64url'), loc.searchParams.get('code_challenge'));
});

test('safeNext refuses traversal, backslashes, percent escapes and other origins; accepts both languages', () => {
  for (const ok of ['/membros/', '/en/members/', '/membros/#/quadro', '/en/members/#/docs/README.md']) assert.equal(safeNext(ok), ok);
  for (const bad of ['/membros/..', '/membros/../x', '/membros/./', '/en/members/../../x', '/membros/\\evil', '/membros/%0d%0aSet-Cookie:x', '/membros/%2e%2e/', '/membros/%5cevil',
    '/membros/\r\n', '/membros/ x', '/membros/?a=1', '/membros/#a#b', '/membros/#%0d', '/membrosevil', 'membros/', '/\\evil.example', 'javascript:alert(1)'])
    assert.equal(safeNext(bad), '/membros/', JSON.stringify(bad));
});

test('when GitHub cannot answer (403 SSO, 429, 5xx) nobody is signed out or called a non-member', async () => {
  const cookie = await sealedSession();
  for (const status of [403, 429, 500, 502, 503]) {
    const r = await handle(get('/session', { ...SITE, Cookie: cookie }), env, github(status).f);
    assert.equal(r.status, 503, `session with ${status}`);
    assert.equal(cookieOf(r, SESSION_COOKIE), undefined, `the cookie stays with ${status}`);
    // a callback goes to the error page, not to "outside", keeps nothing and revokes the fresh token
    const { loc, cookie: oauth } = await startLogin();
    const gh = github(status);
    const cb = await handle(new Request(`https://auth.kalangoos.com/callback?code=abc&state=${loc.searchParams.get('state')}`, { headers: { Cookie: oauth } }), env, gh.f);
    assert.equal(cb.headers.get('Location'), 'https://kalangoos.com/membros/#/erro', `callback with ${status}`);
    assert.equal(cookieOf(cb, SESSION_COOKIE), undefined);
    assert.ok(revoked(gh.calls));
    const pr = await handle(get('/project', { ...SITE, Cookie: cookie }), env, github(200, () => new Response('{}', { status })).f);
    assert.equal(pr.status, 503, `project with ${status}`);
    assert.equal(cookieOf(pr, SESSION_COOKIE), undefined);
  }
  // a network failure is "cannot answer" too
  const boom = (async () => { throw new Error('network'); }) as unknown as typeof fetch;
  const r = await handle(get('/session', { ...SITE, Cookie: cookie }), env, boom);
  assert.equal(r.status, 503);
  assert.equal(cookieOf(r, SESSION_COOKIE), undefined);
  // while a definite answer still ends the session
  assert.equal((await handle(get('/session', { ...SITE, Cookie: cookie }), env, github(401).f)).status, 401);
  assert.equal((await handle(get('/session', { ...SITE, Cookie: cookie }), env, github(404).f)).status, 401);
});

test('responses carry HSTS, no-store and nosniff', async () => {
  const r = await handle(get('/session', SITE), env, github(404).f);
  assert.match(r.headers.get('Strict-Transport-Security')!, /max-age=31536000/);
  assert.equal(r.headers.get('Cache-Control'), 'no-store');
  assert.equal(r.headers.get('X-Content-Type-Options'), 'nosniff');
});

test('what GitHub or the visitor sends is cut and cleaned before it reaches the logs', async () => {
  assert.equal(logSafe('x'.repeat(500)).length, 60);
  assert.equal(logSafe('a\nb<script>https://x.y/?code=1'), 'a?b?script?https:??x.y??code?1');
  const warn = mock.method(console, 'warn', () => undefined);
  const { loc, cookie } = await startLogin();
  await handle(new Request(`https://auth.kalangoos.com/callback?error=${encodeURIComponent('<b>\nforjado https://evil.example/?code=SEGREDO' + 'z'.repeat(300))}&state=${loc.searchParams.get('state')}`, { headers: { Cookie: cookie } }), env, github(404).f);
  const logged = warn.mock.calls.map((c) => c.arguments.join(' ')).join('\n');
  warn.mock.restore();
  assert.ok(logged.includes('callback'));
  assert.ok(!/[<>]/.test(logged) && !logged.includes('://') && logged.split('\n').length === 1, logged);
  assert.ok(logged.length < 140, `logged ${logged.length} chars`);
});

test('/callback: a network failure or a bad answer from GitHub ends on the error page, and a fresh token is revoked', async () => {
  const cases: [string, (url: string) => Response | Promise<Response>, boolean][] = [
    ['token exchange unreachable', (u) => { if (u.endsWith('/access_token')) throw new Error('net'); return new Response('{}', { status: 404 }); }, false],
    ['/user unreachable', (u) => { if (u === 'https://api.github.com/user') throw new Error('net'); return u.endsWith('/access_token') ? Response.json({ access_token: 'gho_t' }) : new Response(null, { status: 204 }); }, true],
    ['/user not JSON', (u) => { if (u === 'https://api.github.com/user') return new Response('<html>', { status: 200 }); return u.endsWith('/access_token') ? Response.json({ access_token: 'gho_t' }) : new Response(null, { status: 204 }); }, true],
    ['/user without login', (u) => { if (u === 'https://api.github.com/user') return Response.json({}); return u.endsWith('/access_token') ? Response.json({ access_token: 'gho_t' }) : new Response(null, { status: 204 }); }, true],
  ];
  for (const [name, answer, revokes] of cases) {
    const { loc, cookie } = await startLogin();
    const calls: { method: string; url: string }[] = [];
    const f = (async (input: RequestInfo | URL, init?: RequestInit) => { calls.push({ method: init?.method ?? 'GET', url: String(input) }); return answer(String(input)); }) as typeof fetch;
    const r = await handle(new Request(`https://auth.kalangoos.com/callback?code=abc&state=${loc.searchParams.get('state')}`, { headers: { Cookie: cookie } }), env, f);
    assert.equal(r.status, 302, name);
    assert.equal(r.headers.get('Location'), 'https://kalangoos.com/membros/#/erro', name);
    assert.equal(cookieOf(r, SESSION_COOKIE), undefined, name);
    assert.equal(revoked(calls), revokes, `${name}: revoke`);
  }
});
