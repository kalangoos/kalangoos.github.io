import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Token, Tokens } from 'marked';
import { Icon } from '../components/Icon';
import { BLOB, TREE, fetchFile, fold, parseMeta, parseTasks, progress, specCatalog, slugify, type ChangeEntry, type TaskGroup } from './repo';
import { InlineMd, Markdown, headings, lex, type Heading } from './Markdown';
import { Notice, SearchField, SideItem, SidePanel, Toc, scrollToId, useSlashFocus, useTree } from './Layout';

const TABS = [
  { id: 'proposta', label: 'Proposta' },
  { id: 'design', label: 'Design' },
  { id: 'tarefas', label: 'Tarefas' },
  { id: 'specs', label: 'Specs' },
] as const;

/** Especificação: the OpenSpec specs and the active changes (proposal, design, tasks, delta specs) of the repository. */
export function Spec({ kind, id, tab }: { kind: 's' | 'c'; id: string; tab?: string }) {
  const { paths, error } = useTree();
  const cat = useMemo(() => (paths ? specCatalog(paths) : null), [paths]);
  const [tasks, setTasks] = useState<Map<string, TaskGroup[]>>(new Map());
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useSlashFocus(input);

  // every change's tasks.md, for the progress bars in the list
  useEffect(() => {
    if (!cat) return;
    let live = true;
    Promise.all(
      cat.changes.filter((c) => c.files.tasks).map((c) => fetchFile(c.files.tasks!).then((md): [string, TaskGroup[]] => [c.id, parseTasks(md)], (): [string, TaskGroup[]] => [c.id, []])),
    ).then((all) => live && setTasks(new Map(all)));
    return () => {
      live = false;
    };
  }, [cat]);

  // no id: the first active change
  const change = cat?.changes.find((c) => c.id === id) ?? (kind === 'c' && !id ? cat?.changes[0] : undefined);
  const spec = kind === 's' ? cat?.specs.find((s) => s.id === id) : undefined;
  const label = spec?.label ?? change?.label ?? 'Especificação';
  const q = fold(query.trim());
  const show = (s: string) => !q || fold(s).includes(q);

  const search = (inSheet: boolean) => <SearchField value={query} onChange={setQuery} placeholder="Buscar nas specs" inputRef={inSheet ? undefined : input} />;
  return (
    <div className="mview">
      <SidePanel title="Especificação" current={label} icon="list" search={search}>
        <p className="side__group">Especificações</p>
        {cat?.specs.filter((s) => show(s.label)).map((s) => (
          <SideItem key={s.id} href={`#/spec/s/${s.id}`} label={s.label} icon="list" current={s === spec} />
        ))}
        <p className="side__group">Mudanças ativas</p>
        {cat?.changes.filter((c) => show(c.label)).map((c) => (
          <SideItem
            key={c.id}
            href={`#/spec/c/${c.id}`}
            label={c.label}
            icon="check"
            current={c === change && !spec}
            progress={tasks.has(c.id) ? progress(tasks.get(c.id)!) : { done: 0, total: 0 }}
          />
        ))}
      </SidePanel>
      {error ? (
        <div className="mcontent">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : !cat ? (
        <Loading />
      ) : spec ? (
        <SpecPage path={spec.path} title={spec.label} crumbs={['openspec', 'specs', spec.id]} />
      ) : change ? (
        <ChangePage change={change} tab={tab ?? 'tarefas'} groups={tasks.get(change.id) ?? null} />
      ) : (
        <div className="mcontent">
          <Notice tone="error">Esta especificação não existe no repositório.</Notice>
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <div className="mcontent">
      <div className="skeleton" aria-label="Carregando">
        <i style={{ width: '50%', height: 40 }} />
        <i style={{ width: '30%' }} />
        <i />
        <i style={{ width: '70%' }} />
      </div>
    </div>
  );
}

function Crumbs({ parts, href }: { parts: string[]; href: string }) {
  return (
    <div className="crumbs">
      <span className="mono">
        {parts.map((p, i) => (
          <span key={i}>
            {i > 0 && <span className="crumbs__sep" aria-hidden="true">›</span>}
            {p}
          </span>
        ))}
      </span>
      <a className="crumbs__gh" href={href} target="_blank" rel="noopener noreferrer">
        Abrir no GitHub
        <Icon name="external" />
      </a>
    </div>
  );
}

/** "### Requirement:" sections become cards, with "#### Scenario:" blocks inside. */
function requirementCards(tokens: Token[], render: (ts: Token[]) => ReactNode): ReactNode {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i]!;
    if (t.type === 'heading' && (t as Tokens.Heading).depth === 3 && /^Requirement:/i.test((t as Tokens.Heading).text)) {
      let j = i + 1;
      while (j < tokens.length && !(tokens[j]!.type === 'heading' && (tokens[j] as Tokens.Heading).depth <= 3)) j++;
      out.push(
        <section key={i} className="req">
          {render(tokens.slice(i, j))}
        </section>,
      );
      i = j;
    } else {
      out.push(<div key={i}>{render([t])}</div>);
      i++;
    }
  }
  return out;
}

function useMarkdown(path: string | undefined) {
  const [s, setS] = useState<{ path: string; tokens: Token[] } | { path: string; error: true } | null>(null);
  useEffect(() => {
    if (!path) return;
    let live = true;
    fetchFile(path).then(
      (md) => live && setS({ path, tokens: lex(md) }),
      () => live && setS({ path, error: true }),
    );
    return () => {
      live = false;
    };
  }, [path]);
  return s && s.path === path ? s : null;
}

const NO_DOCS = new Set<string>();

const dropTitle = (tokens: Token[]) => tokens.filter((t, i) => !(i === 0 && t.type === 'heading'));

function specHeadings(tokens: Token[]): Heading[] {
  return headings(tokens).map((h) => ({ ...h, text: h.text.replace(/^Requirement:\s*/i, '') }));
}

function SpecPage({ path, title, crumbs }: { path: string; title: string; crumbs: string[] }) {
  const md = useMarkdown(path);
  const body = useMemo(() => (md && 'tokens' in md ? dropTitle(md.tokens) : []), [md]);
  const toc = useMemo(() => specHeadings(body), [body]);
  useEffect(() => scrollTo({ top: 0 }), [path]);
  return (
    <>
      <article className="mcontent">
        <Crumbs parts={crumbs} href={BLOB + path} />
        <h1 className="display mtitle">{title}</h1>
        {!md ? (
          <Loading />
        ) : 'error' in md ? (
          <Notice tone="error">Não foi possível abrir este arquivo no GitHub.</Notice>
        ) : (
          <div className="doc doc--spec" key={path}>
            <Toc items={toc} />
            <Markdown tokens={body} path={path} docs={NO_DOCS} onAnchor={scrollToId} wrap={requirementCards} />
          </div>
        )}
      </article>
      <div className="mtoc">{toc.length > 0 && <Toc items={toc} />}</div>
    </>
  );
}

function ChangePage({ change, tab, groups }: { change: ChangeEntry; tab: string; groups: TaskGroup[] | null }) {
  const [meta, setMeta] = useState<{ schema?: string; created?: string }>({});
  useEffect(() => {
    if (!change.files.meta) return;
    let live = true;
    fetchFile(change.files.meta).then((y) => live && setMeta(parseMeta(y)), () => undefined);
    return () => {
      live = false;
    };
  }, [change]);
  useEffect(() => scrollTo({ top: 0 }), [change.id]);
  const p = groups ? progress(groups) : null;
  const created = meta.created && /^\d{4}-\d{2}-\d{2}$/.test(meta.created) ? meta.created.split('-').reverse().join('/') : meta.created;
  const file = tab === 'proposta' ? change.files.proposal : tab === 'design' ? change.files.design : undefined;
  const toc: Heading[] =
    tab === 'tarefas' && groups ? groups.map((g) => ({ depth: 2, text: g.title, id: `g-${slugify(g.title)}` })) : [];

  return (
    <>
      <article className="mcontent">
        <Crumbs parts={['openspec', 'changes', change.id]} href={TREE + `openspec/changes/${change.id}`} />
        <h1 className="display mtitle">{change.label}</h1>
        <div className="chips">
          <span className="chip">mudança ativa</span>
          {meta.schema && <span className="chip">{meta.schema}</span>}
          {created && <span className="chip">criada em {created}</span>}
        </div>
        <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={p?.total ?? 0} aria-valuenow={p?.done ?? 0} aria-label="Tarefas feitas">
          <i style={{ width: p && p.total ? `${(100 * p.done) / p.total}%` : 0 }} />
        </div>
        <p className="progress__label">{p ? `${p.done} de ${p.total} tarefas feitas` : 'Contando as tarefas…'}</p>
        <nav className="mtabs-row" aria-label="Partes da mudança">
          {TABS.map((t) => (
            <a key={t.id} href={`#/spec/c/${change.id}/${t.id}`} aria-current={tab === t.id ? 'page' : undefined}>
              {t.label}
              {t.id === 'specs' && ` · ${change.specs.length}`}
            </a>
          ))}
        </nav>
        {tab === 'tarefas' && (groups ? <Tasks groups={groups} /> : <Loading />)}
        {(tab === 'proposta' || tab === 'design') && (file ? <FileBody path={file} /> : <Notice>Esta mudança não tem {tab === 'design' ? 'design.md' : 'proposal.md'}.</Notice>)}
        {tab === 'specs' && (
          <div className="spec-files">
            {change.specs.map((sp) => (
              <section key={sp} className="spec-file">
                <h2 className="spec-file__path mono">{sp.replace(`openspec/changes/${change.id}/specs/`, '').replace(/\/spec\.md$/, '')}</h2>
                <FileBody path={sp} cards />
              </section>
            ))}
          </div>
        )}
      </article>
      <div className="mtoc">{toc.length > 0 && <Toc items={toc} />}</div>
    </>
  );
}

function FileBody({ path, cards }: { path: string; cards?: boolean }) {
  const md = useMarkdown(path);
  if (!md) return <Loading />;
  if ('error' in md) return <Notice tone="error">Não foi possível abrir {path} no GitHub.</Notice>;
  return (
    <div className="doc doc--spec">
      <Markdown tokens={md.tokens} path={path} docs={NO_DOCS} onAnchor={scrollToId} wrap={cards ? requirementCards : undefined} />
    </div>
  );
}

function Tasks({ groups }: { groups: TaskGroup[] }) {
  return (
    <div className="tasks">
      {groups.map((g) => {
        const p = progress([g]);
        return (
          <section key={g.title} className="tasks__group" aria-labelledby={`g-${slugify(g.title)}`}>
            <h2 id={`g-${slugify(g.title)}`}>
              {g.title}
              <span className="mono">
                {p.done}/{p.total}
              </span>
            </h2>
            <ul>
              {g.tasks.map((t, i) => (
                <li key={i} className={t.done ? 'is-done' : undefined}>
                  <span className={`task__box${t.done ? ' is-done' : ''}`} role="img" aria-label={t.done ? 'feita' : 'a fazer'} />
                  <span className="tasks__id mono">{t.id}</span>
                  <span className="tasks__text">
                    <InlineMd text={t.text} />
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
