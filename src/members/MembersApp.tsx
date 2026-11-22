import { useEffect, useMemo, useState, type ReactNode } from 'react';
import '../styles/site.css';
import '../styles/members.css';
import type { Content } from '../content';
import { Site } from '../lib/context';
import { Bar } from '../components/Bar';
import { Icon } from '../components/Icon';
import type { MemberState } from '../components/Member';
import { AUTH_URL, MEMBERS_PREVIEW, ORG, REPO, fetchSession, loginUrl } from './auth';
import { Docs } from './Docs';
import { Spec } from './Spec';
import { Board } from './Board';

/** Routes live in the hash (#/docs/…, #/spec/…, #/quadro, #/fora): GitHub Pages has no rewrites. */
export type Route =
  | { view: 'docs'; path: string; heading?: string }
  | { view: 'spec'; kind: 's' | 'c'; id: string; tab?: string }
  | { view: 'board' }
  | { view: 'outside'; login: string }
  | { view: 'error' };

export const DEFAULT_DOC = 'README.md';

export function parseRoute(hash: string): Route {
  const h = decodeURIComponent(hash.replace(/^#/, ''));
  const [path, query = ''] = h.split('?') as [string, string?];
  const q = new URLSearchParams(query);
  if (path.startsWith('/fora')) return { view: 'outside', login: q.get('login') ?? '' };
  if (path.startsWith('/erro')) return { view: 'error' };
  if (path.startsWith('/quadro')) return { view: 'board' };
  const spec = /^\/spec\/([sc])\/([^/]+(?:\/[^/]+)*?)(?:\/(proposta|design|tarefas|specs))?$/.exec(path);
  if (spec) return { view: 'spec', kind: spec[1] as 's' | 'c', id: spec[2]!, tab: spec[3] };
  if (path.startsWith('/spec')) return { view: 'spec', kind: 'c', id: '' };
  const doc = /^\/docs\/(.+)$/.exec(path);
  return { view: 'docs', path: doc ? doc[1]! : DEFAULT_DOC, heading: q.get('h') ?? undefined };
}

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

type Gate = 'checking' | 'soon' | 'out' | 'in' | 'preview';

export function MembersApp({ t }: { t: Content }) {
  const route = useRoute();
  const [gate, setGate] = useState<Gate>(MEMBERS_PREVIEW ? 'preview' : AUTH_URL ? 'checking' : 'soon');
  const [member, setMember] = useState<MemberState>(AUTH_URL ? { kind: 'checking' } : { kind: 'soon' });
  const ctx = useMemo(() => ({ t, lang: 'pt-BR' as const, page: 'home' as const, openShot: () => undefined }), [t]);

  useEffect(() => {
    (window as Window & { __kalangoMounted?: boolean }).__kalangoMounted = true;
    if (!AUTH_URL) return;
    const ac = new AbortController();
    fetchSession(ac.signal)
      .then((s) => {
        setMember(s ? { kind: 'in', session: s } : { kind: 'out' });
        if (!MEMBERS_PREVIEW) setGate(s ? 'in' : 'out');
      })
      .catch(() => {
        setMember({ kind: 'out' });
        if (!MEMBERS_PREVIEW) setGate('out');
      });
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const titles: Record<Route['view'], string> = { docs: 'Documentação', spec: 'Especificação', board: 'Quadro de tarefas', outside: 'Área de membros', error: 'Área de membros' };
    document.title = `${gate === 'in' || gate === 'preview' ? titles[route.view] : 'Área de membros'} · KalangoOS`;
  }, [route.view, gate]);

  let body: ReactNode;
  if (route.view === 'outside') body = <GateCard kind="outside" login={route.login} />;
  else if (gate === 'soon') body = <GateCard kind="soon" />;
  else if (gate === 'checking' || gate === 'out' || route.view === 'error') body = <GateCard kind="login" checking={gate === 'checking'} failed={route.view === 'error'} />;
  else body = <Shell route={route} login={member.kind === 'in' ? member.session.login : null} preview={gate === 'preview'} />;

  return (
    <Site.Provider value={ctx}>
      <a className="skip" href="#main">
        {t.a11y.skip}
      </a>
      <Bar onLanding={false} member={member} />
      <main id="main" className={`members-main${route.view !== 'outside' && (gate === 'in' || gate === 'preview') ? ' is-shell' : ''}`}>
        {body}
      </main>
    </Site.Provider>
  );
}

// ------------------------------------------------------------------ the entry cards

function GateCard({ kind, login, checking, failed }: { kind: 'login' | 'outside' | 'soon'; login?: string; checking?: boolean; failed?: boolean }) {
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
        <p className="eyebrow">Área de membros</p>
        <h1 id="gate-title" className="display">
          {kind === 'login' && 'Entre com a sua conta do GitHub'}
          {kind === 'outside' && `Esta área é só para quem é da organização ${ORG}`}
          {kind === 'soon' && 'A área de membros ainda não está conectada'}
        </h1>
        <p className="gate__text">
          {kind === 'login' &&
            `A documentação técnica, a especificação e o quadro de tarefas do KalangoOS num lugar só. Só entra quem faz parte da organização ${ORG} no GitHub.`}
          {kind === 'outside' && (
            <>
              {login ? <>Você entrou como <b>@{login}</b>, mas essa conta</> : 'A conta com que você entrou'} não faz parte da organização {ORG} no
              GitHub. O código, a documentação e a especificação são públicos no repositório, e qualquer pessoa pode contribuir.
            </>
          )}
          {kind === 'soon' &&
            'O login com o GitHub entra no ar quando o serviço de autenticação for ligado. Enquanto isso, a documentação e a especificação estão no repositório público.'}
        </p>
        {kind === 'login' && (
          <>
            {failed && (
              <p className="gate__notice gate__notice--error">
                <Icon name="alert" />
                <span>Não deu para concluir a entrada (o pedido expirou ou foi recusado no GitHub). Tente de novo.</span>
              </p>
            )}
            <a
              className={`btn btn--primary btn--lg gate__wide${checking ? ' is-busy' : ''}`}
              href={checking ? undefined : loginUrl()}
              aria-disabled={checking || undefined}
              onClick={() => setLeaving(true)}
            >
              <Icon name="github" className="icon" />
              {checking ? 'Conferindo a sessão…' : leaving ? 'Abrindo o GitHub…' : 'Entrar com o GitHub'}
            </a>
            <p className="gate__fine">
              Pedimos só leitura: a sua participação na organização (read:org) e os projetos (read:project). Nada é publicado em seu nome, e a
              sessão fica num cookie protegido do serviço de login, nunca no armazenamento do navegador.
            </p>
          </>
        )}
        {kind === 'outside' && (
          <>
            <div className="gate__row">
              <a className="btn btn--primary btn--lg" href={`https://github.com/${REPO}`}>
                <Icon name="github" className="icon" />
                Ver o repositório
              </a>
              <a className="btn btn--secondary btn--lg" href={`https://github.com/${REPO}/blob/main/CONTRIBUTING.md`}>
                Como contribuir
              </a>
            </div>
            {AUTH_URL && (
              <a className="gate__link" href={loginUrl(true)}>
                Entrar com outra conta
              </a>
            )}
          </>
        )}
        {kind === 'soon' && (
          <>
            <p className="gate__notice">
              <Icon name="info" />
              <span>Falta ligar o serviço de login (Cloudflare Worker) e o app OAuth do GitHub.</span>
            </p>
            <button type="button" className="btn btn--primary btn--lg gate__wide" disabled>
              <Icon name="github" className="icon" />
              Entrar com o GitHub
            </button>
          </>
        )}
        <hr />
        {kind === 'outside' ? (
          <a className="gate__foot is-muted" href={`https://docs.github.com/pt/organizations/managing-membership-in-your-organization`}>
            Por que não entro? A organização decide quem é membro
            <Icon name="chev" className="icon icon--sm" />
          </a>
        ) : (
          <a className="gate__foot" href={kind === 'soon' ? `https://github.com/${REPO}/tree/main/docs` : `https://github.com/${REPO}`}>
            {kind === 'soon' ? 'Ler a documentação no repositório' : 'Não é da organização? Contribua pelo repositório público'}
            <Icon name="chev" className="icon icon--sm" />
          </a>
        )}
      </section>
    </div>
  );
}

// ------------------------------------------------------------------ the area: rail (tabs on phones) and the views

const VIEWS = [
  { view: 'docs', href: '#/docs/' + DEFAULT_DOC, icon: 'doc', label: 'Documentação', short: 'Docs' },
  { view: 'spec', href: '#/spec', icon: 'list', label: 'Especificação', short: 'Especificação' },
  { view: 'board', href: '#/quadro', icon: 'board', label: 'Quadro de tarefas', short: 'Quadro' },
] as const;

function Shell({ route, login, preview }: { route: Route; login: string | null; preview: boolean }) {
  return (
    <div className="members">
      <nav className="rail" aria-label="Área de membros">
        {VIEWS.map((v) => (
          <a key={v.view} href={v.href} className="rail__item" aria-current={route.view === v.view ? 'page' : undefined}>
            <Icon name={v.icon} />
            <span className="rail__tip">{v.label}</span>
            <span className="visually-hidden">{v.label}</span>
          </a>
        ))}
        <a href="/" className="rail__item rail__home">
          <Icon name="home" />
          <span className="rail__tip">Voltar ao site</span>
          <span className="visually-hidden">Voltar ao site</span>
        </a>
      </nav>
      <nav className="mtabs" aria-label="Área de membros">
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
            Prévia local, sem sessão: documentação e especificação vêm do repositório público; o quadro precisa do serviço de login.
          </p>
        )}
        {route.view === 'docs' && <Docs path={route.path} heading={route.heading} />}
        {route.view === 'spec' && <Spec kind={route.kind} id={route.id} tab={route.tab} />}
        {route.view === 'board' && <Board login={login} connected={!!AUTH_URL && !preview} />}
      </div>
    </div>
  );
}
