import { useEffect, useState, type ReactNode } from 'react';
import { useSite } from '../lib/context';
import { pathOf } from '../lib/routes';
import { Bar } from '../components/Bar';
import { Icon } from '../components/Icon';
import type { MemberState } from '../components/Member';
import { AUTH_URL, MEMBERS_PREVIEW, REPO, fetchSession, loginUrl } from './auth';
import { DEFAULT_DOC, parseRoute, type Route } from './route';
import { Docs } from './Docs';
import { Spec } from './Spec';
import { Board } from './Board';

function useRoute(): Route {
  // the server render and the first client render agree on the default; the hash is read after hydration
  const [route, setRoute] = useState<Route>({ view: 'docs', path: DEFAULT_DOC });
  useEffect(() => {
    const read = () => setRoute(parseRoute(location.hash));
    read();
    addEventListener('hashchange', read);
    return () => removeEventListener('hashchange', read);
  }, []);
  return route;
}

/** soon: no login service in this build (VITE_AUTH_URL empty; nothing is requested). down: the service did not answer. */
type Gate = 'checking' | 'soon' | 'out' | 'down' | 'in' | 'preview';

/** The members page (/membros/ and /en/members/): the entry card, or the area once the session is known. */
export function MembersApp() {
  const { t } = useSite();
  const route = useRoute();
  const [gate, setGate] = useState<Gate>(MEMBERS_PREVIEW ? 'preview' : AUTH_URL ? 'checking' : 'soon');
  const [member, setMember] = useState<MemberState>(AUTH_URL ? { kind: 'checking' } : { kind: 'soon' });

  useEffect(() => {
    if (!AUTH_URL) return; // login OFF: not a single request to the service
    const ac = new AbortController();
    fetchSession(ac.signal)
      .then((s) => {
        setMember(s ? { kind: 'in', session: s } : { kind: 'out' });
        if (!MEMBERS_PREVIEW) setGate(s ? 'in' : 'out');
      })
      .catch((e) => {
        if ((e as Error).name === 'AbortError') return;
        setMember({ kind: 'out' });
        if (!MEMBERS_PREVIEW) setGate('down');
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const open = gate === 'in' || gate === 'preview';
    document.title = open ? `${t.members.titles[route.view === 'outside' || route.view === 'error' ? 'docs' : route.view]} · KalangoOS` : t.members.title;
  }, [route.view, gate, t]);

  let body: ReactNode;
  if (route.view === 'outside') body = <GateCard kind="outside" login={route.login} />;
  else if (gate === 'soon') body = <GateCard kind="soon" />;
  else if (gate === 'checking' || gate === 'out' || gate === 'down' || route.view === 'error')
    body = <GateCard kind="login" checking={gate === 'checking'} notice={route.view === 'error' ? 'error' : gate === 'down' ? 'down' : undefined} />;
  else body = <Shell route={route} login={member.kind === 'in' ? member.session.login : null} preview={gate === 'preview'} />;

  return (
    <>
      <a className="skip" href="#main">
        {t.a11y.skip}
      </a>
      <Bar member={member} />
      <main id="main" className={`members-main${route.view !== 'outside' && (gate === 'in' || gate === 'preview') ? ' is-shell' : ''}`}>
        {body}
      </main>
    </>
  );
}

// ------------------------------------------------------------------ the entry cards

function GateCard({ kind, login, checking, notice }: { kind: 'login' | 'outside' | 'soon'; login?: string; checking?: boolean; notice?: 'error' | 'down' }) {
  const { t, lang } = useSite();
  const M = t.members;
  const [leaving, setLeaving] = useState(false);
  return (
    <div className="gate">
      <section className="gate__card" aria-labelledby="gate-title">
        {kind === 'outside' ? (
          <span className="gate__icon">
            <Icon name="lock" />
          </span>
        ) : (
          <img className="gate__symbol" src="/img/brand/symbol.webp" width="44" height="48" alt="" />
        )}
        <p className="eyebrow">{M.eyebrow}</p>
        <h1 id="gate-title" className="display">
          {kind === 'login' && M.login.title}
          {kind === 'outside' && M.outside.title}
          {kind === 'soon' && M.soon.title}
        </h1>
        <p className="gate__text">
          {kind === 'login' && M.login.text}
          {kind === 'outside' && (
            <>
              {/* `login` already passed the GitHub login charset (route.ts); anything else is not shown at all */}
              {login ? <>{M.outside.as} <b>@{login}</b>, {M.outside.but}</> : M.outside.unknown} {M.outside.text}
            </>
          )}
          {kind === 'soon' && M.soon.text}
        </p>
        {kind === 'login' && (
          <>
            {notice && (
              <p className="gate__notice gate__notice--error" role="alert">
                <Icon name="alert" />
                <span>{notice === 'down' ? M.login.down : M.login.error}</span>
              </p>
            )}
            <a
              className={`btn btn--primary btn--lg gate__wide${checking ? ' is-busy' : ''}`}
              href={checking ? undefined : loginUrl(lang)}
              aria-disabled={checking || undefined}
              onClick={() => setLeaving(true)}
            >
              <Icon name="github" className="icon" />
              {checking ? M.login.checking : leaving ? M.login.opening : M.login.button}
            </a>
            <p className="gate__fine">{M.login.fine}</p>
          </>
        )}
        {kind === 'outside' && (
          <>
            <div className="gate__row">
              <a className="btn btn--primary btn--lg" href={`https://github.com/${REPO}`}>
                <Icon name="github" className="icon" />
                {M.outside.repo}
              </a>
              <a className="btn btn--secondary btn--lg" href={`https://github.com/${REPO}/blob/main/CONTRIBUTING.md`}>
                {M.outside.contribute}
              </a>
            </div>
            {AUTH_URL && (
              <a className="gate__link" href={loginUrl(lang, true)}>
                {M.outside.other}
              </a>
            )}
          </>
        )}
        {kind === 'soon' && (
          <>
            <p className="gate__notice">
              <Icon name="info" />
              <span>{M.soon.notice}</span>
            </p>
            <button type="button" className="btn btn--primary btn--lg gate__wide" disabled>
              <Icon name="github" className="icon" />
              {M.soon.button}
            </button>
          </>
        )}
        <hr />
        {kind === 'outside' ? (
          <a className="gate__foot is-muted" href={`https://docs.github.com/${lang === 'en' ? 'en' : 'pt'}/organizations/managing-membership-in-your-organization`}>
            {M.outside.why}
            <Icon name="chev" className="icon icon--sm" />
          </a>
        ) : (
          <a className="gate__foot" href={kind === 'soon' ? `https://github.com/${REPO}/tree/main/docs` : `https://github.com/${REPO}`}>
            {kind === 'soon' ? M.soon.foot : M.login.foot}
            <Icon name="chev" className="icon icon--sm" />
          </a>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ the area: rail (tabs on phones) and the views

function Shell({ route, login, preview }: { route: Route; login: string | null; preview: boolean }) {
  const { t, lang } = useSite();
  const N = t.members.nav;
  const VIEWS = [
    { view: 'docs', href: '#/docs/' + DEFAULT_DOC, icon: 'doc', label: N.docs, short: N.docsShort },
    { view: 'spec', href: '#/spec', icon: 'list', label: N.spec, short: N.specShort },
    { view: 'board', href: '#/quadro', icon: 'board', label: N.board, short: N.boardShort },
  ] as const;
  return (
    <div className="members">
      <nav className="rail" aria-label={N.label}>
        {VIEWS.map((v) => (
          <a key={v.view} href={v.href} className="rail__item" aria-current={route.view === v.view ? 'page' : undefined}>
            <Icon name={v.icon} />
            <span className="rail__tip">{v.label}</span>
            <span className="visually-hidden">{v.label}</span>
          </a>
        ))}
        <a href={pathOf(lang, 'home')} className="rail__item rail__home">
          <Icon name="home" />
          <span className="rail__tip">{N.back}</span>
          <span className="visually-hidden">{N.back}</span>
        </a>
      </nav>
      <nav className="mtabs" aria-label={N.label}>
        {VIEWS.map((v) => (
          <a key={v.view} href={v.href} aria-current={route.view === v.view ? 'page' : undefined}>
            <Icon name={v.icon} />
            {v.short}
          </a>
        ))}
      </nav>
      <div className="members__view">
        {preview && (
          <p className="preview-note">
            <Icon name="info" />
            {t.members.preview}
          </p>
        )}
        {route.view === 'docs' && <Docs path={route.path} heading={route.heading} />}
        {route.view === 'spec' && <Spec kind={route.kind} id={route.id} tab={route.tab} />}
        {route.view === 'board' && <Board login={login} connected={!!AUTH_URL && !preview} />}
      </div>
    </div>
  );
}
