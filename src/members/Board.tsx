import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { ORG } from './constants';
import { fetchProject } from './auth';
import { useSite } from '../lib/context';
import { NO_FILTER, STATUS_TOKEN, facets, mapProject, matches, shortRef, type Board as BoardData, type BoardFilter, type BoardItem } from './project';
import { SearchField, useSlashFocus } from './Layout';

const PROJECTS = `https://github.com/orgs/${ORG}/projects`;

type Load = { kind: 'off' } | { kind: 'loading' } | { kind: 'none' } | { kind: 'error'; session: boolean } | { kind: 'ok'; board: BoardData; at: Date };

/**
 * Quadro de tarefas: the organisation's GitHub Project (v2), read by the Worker with the session's token. Without a
 * session or a project it says so; it never shows sample cards.
 */
export function Board({ login, connected }: { login: string | null; connected: boolean }) {
  const [load, setLoad] = useState<Load>(connected ? { kind: 'loading' } : { kind: 'off' });
  const [f, setF] = useState<BoardFilter>(NO_FILTER);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [col, setCol] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  useSlashFocus(input);

  useEffect(() => {
    if (!connected) return;
    const ac = new AbortController();
    fetchProject(ac.signal)
      .then((data) => {
        const board = mapProject(data);
        setLoad(board ? { kind: 'ok', board, at: new Date() } : { kind: 'none' });
      })
      .catch((e: Error & { code?: string }) => {
        if (e.name !== 'AbortError') setLoad({ kind: 'error', session: e.code === 'session' });
      });
    return () => ac.abort();
  }, [connected]);

  const board = load.kind === 'ok' ? load.board : null;
  const fc = useMemo(() => (board ? facets(board) : null), [board]);
  const shown = useMemo(
    () => (board ? board.columns.map((c) => ({ ...c, items: c.items.filter((i) => matches(i, f)) })) : []),
    [board, f],
  );
  const count = shown.reduce((n, c) => n + c.items.length, 0);
  const strip = useRef<HTMLDivElement>(null);

  return (
    <div className="board">
      <header className="board__head">
        <div>
          <h1 className="display">Quadro de tarefas</h1>
          <p className="board__sub">
            {board ? `${board.title} · ` : ''}GitHub Projects da organização {ORG}
          </p>
        </div>
        <a className="btn btn--secondary" href={board?.url || PROJECTS} target="_blank" rel="noopener noreferrer">
          <Icon name="external" className="icon" />
          Abrir no GitHub
        </a>
      </header>

      {board && fc && (
        <div className={`board__filters${filtersOpen ? ' is-open' : ''}`}>
          <SearchField value={f.text} onChange={(text) => setF({ ...f, text })} placeholder="Filtrar cartões" inputRef={input} />
          <button type="button" className="fbtn" aria-expanded={filtersOpen} aria-label="Filtros" onClick={() => setFiltersOpen((o) => !o)}>
            <Icon name="filter" />
          </button>
          <Select label="Responsável" value={f.assignee} options={fc.assignees} onChange={(assignee) => setF({ ...f, assignee })} />
          <Select label="Rótulo" value={f.label} options={fc.labels} onChange={(label) => setF({ ...f, label })} />
          <Select label="Repositório" value={f.repo} options={fc.repos} onChange={(repo) => setF({ ...f, repo })} />
          {login && (
            <button type="button" className="fchip" aria-pressed={f.mine === login} onClick={() => setF({ ...f, mine: f.mine ? null : login })}>
              {f.mine && <Icon name="check" />}
              Só os meus
            </button>
          )}
          <span className="board__count">
            {count} {count === 1 ? 'cartão' : 'cartões'} · atualizado {fmtTime(load.kind === 'ok' ? load.at : null)}
          </span>
        </div>
      )}

      {board ? (
        <>
          <nav className="board__jump" aria-label="Ir para a coluna">
            {shown.map((c, i) => (
              <button
                key={c.id || c.name}
                type="button"
                aria-current={col === i ? 'true' : undefined}
                onClick={() => strip.current?.children[i]?.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' })}
              >
                {c.name} <span>{c.items.length}</span>
              </button>
            ))}
          </nav>
          <div
            className="board__cols"
            ref={strip}
            onScroll={(e) => {
              const el = e.currentTarget;
              const first = el.children[0] as HTMLElement | undefined;
              if (first) setCol(Math.round(el.scrollLeft / (first.offsetWidth + 12)));
            }}
          >
            {shown.map((c) => (
              <section key={c.id || c.name} className="bcol" aria-label={`${c.name}: ${c.items.length}`}>
                <h2 className="bcol__head">
                  <i style={{ background: `var(--${STATUS_TOKEN[c.color] ?? 'muted'})` }} aria-hidden="true" />
                  {c.name}
                  <span>{c.items.length}</span>
                </h2>
                <ol className="bcol__list">
                  {c.items.map((it, k) => (
                    <li key={it.id} style={{ '--i': Math.min(k, 8) } as React.CSSProperties}>
                      <Card item={it} projectUrl={board.url} />
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </>
      ) : (
        <Empty load={load} />
      )}
    </div>
  );
}

function fmtTime(d: Date | null): string {
  if (!d) return '';
  const s = (Date.now() - d.getTime()) / 1000;
  return s < 60 ? 'agora' : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className={`fchip fchip--select${value ? ' is-set' : ''}`}>
      <span className="visually-hidden">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <Icon name="chevdown" />
    </label>
  );
}

/** Label colours come from GitHub (any hex): drawn as a dot, with the text in the theme's own colour for contrast. */
function Card({ item, projectUrl }: { item: BoardItem; projectUrl: string }) {
  const B = useSite().t.members.board;
  const href = item.url ?? projectUrl;
  const ref = shortRef(item.repo, item.number, ORG);
  const kindLabel = { issue: B.issue, pr: B.pr, draft: B.draft, redacted: B.redacted }[item.kind];
  const title = item.kind === 'redacted' ? B.redactedTitle : item.title;
  return (
    <a className={`bcard bcard--${item.kind}`} href={href} target="_blank" rel="noopener noreferrer">
      <span className="bcard__ref">
        <Icon name={item.kind === 'pr' ? 'pr' : item.kind === 'issue' ? 'issue' : 'doc'} />
        <span className="mono">{ref || kindLabel}</span>
        {item.state && item.state !== 'open' && item.kind !== 'draft' && <span className="bcard__state">{{ closed: B.closed, merged: B.merged, draft: B.draftState }[item.state]}</span>}
        <span className="visually-hidden">{kindLabel}</span>
      </span>
      <b className="bcard__title">{title}</b>
      {item.labels.length > 0 && (
        <span className="bcard__labels">
          {item.labels.map((l) => (
            <span key={l.name} className="blabel" style={{ '--c': `#${l.color}` } as React.CSSProperties}>
              <i aria-hidden="true" />
              {l.name}
            </span>
          ))}
        </span>
      )}
      {(item.links.length > 0 || item.assignees.length > 0) && (
        <span className="bcard__foot">
          <span className="bcard__links">
            {item.links.map((l) => (
              <span key={l.url} className="mono" title={l.kind === 'pr' ? B.linkedPr : B.linkedIssue}>
                <Icon name={l.kind} />#{l.number}
              </span>
            ))}
          </span>
          <span className="bcard__people">
            {item.assignees.map((a) => (
              <img key={a.login} className="avatar" src={a.avatarUrl ? `${a.avatarUrl}${a.avatarUrl.includes('?') ? '&' : '?'}s=48` : undefined} width="24" height="24" alt={a.login} title={a.login} />
            ))}
          </span>
        </span>
      )}
    </a>
  );
}

function Empty({ load }: { load: Load }) {
  const text: Record<Load['kind'], [string, string]> = {
    off: ['O quadro ainda não está conectado', 'Os cartões vêm do GitHub Projects da organização e precisam da sua sessão. Eles aparecem aqui assim que o serviço de login for ligado; nada é inventado enquanto isso.'],
    loading: ['Lendo o quadro…', 'Buscando o projeto da organização no GitHub.'],
    none: ['Nenhum projeto aberto na organização', `A organização ${ORG} ainda não tem um projeto aberto no GitHub Projects.`],
    error: ['Não foi possível ler o quadro', 'O GitHub ou o serviço de login não respondeu. Tente de novo em instantes.'],
    ok: ['', ''],
  };
  const [title, body] = load.kind === 'error' && load.session ? ['A sua sessão terminou', 'Entre de novo para ver o quadro.'] : text[load.kind];
  return (
    <div className="board__empty" aria-busy={load.kind === 'loading'}>
      <span className="board__empty-icon">
        <Icon name="board" />
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      {load.kind !== 'loading' && (
        <a className="btn btn--secondary" href={PROJECTS} target="_blank" rel="noopener noreferrer">
          <Icon name="external" className="icon" />
          Ver os projetos no GitHub
        </a>
      )}
    </div>
  );
}
