import { useEffect, useMemo, useRef, useState } from 'react';
import type { Token } from 'marked';
import { Icon } from '../components/Icon';
import { REPO } from './constants';
import { BLOB, docCatalog, fetchFile, readingMinutes, searchText, type DocEntry, type SearchHit } from './repo';
import { Markdown, headings, lex } from './Markdown';
import { Notice, SearchField, SideItem, SidePanel, Toc, scrollToId, useSlashFocus, useTree } from './Layout';

/** Documentação técnica: docs/*.md and the root documents of kalangoos/kalangoos, as navigable pages. */
export function Docs({ path, heading }: { path: string; heading?: string }) {
  const { paths, error } = useTree();
  const catalog = useMemo(() => (paths ? docCatalog(paths) : []), [paths]);
  const docSet = useMemo(() => new Set(catalog.map((d) => d.path)), [catalog]);
  const [query, setQuery] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useSlashFocus(input);

  const current = catalog.find((d) => d.path === path);
  const search = (inSheet: boolean) => <SearchField value={query} onChange={setQuery} placeholder="Buscar na documentação" inputRef={inSheet ? undefined : input} />;

  return (
    <div className="mview">
      <SidePanel title="Documentação" current={current?.label ?? path} icon="doc" search={search}>
        {query.trim().length > 1 ? (
          <SearchResults catalog={catalog} query={query} />
        ) : (
          <>
            <p className="side__group">Raiz do repositório</p>
            {catalog.filter((d) => d.group === 'root').map((d) => (
              <SideItem key={d.path} href={`#/docs/${d.path}`} label={d.label} icon="doc" current={d.path === path} />
            ))}
            <p className="side__group">docs/</p>
            {catalog.filter((d) => d.group === 'docs').map((d) => (
              <SideItem key={d.path} href={`#/docs/${d.path}`} label={d.label} icon="doc" current={d.path === path} />
            ))}
          </>
        )}
      </SidePanel>
      {error ? (
        <div className="mcontent">
          <Notice tone="error">{error}</Notice>
        </div>
      ) : paths && !current ? (
        <div className="mcontent">
          <Notice tone="error">
            Este documento não está na lista: <code>{path}</code>.
          </Notice>
        </div>
      ) : (
        <DocPage path={path} docs={docSet} heading={heading} ready={!!paths} />
      )}
    </div>
  );
}

function DocPage({ path, docs, heading, ready }: { path: string; docs: Set<string>; heading?: string; ready: boolean }) {
  const [state, setState] = useState<{ path: string; tokens: Token[]; minutes: number } | { path: string; error: string } | null>(null);
  useEffect(() => {
    let live = true;
    fetchFile(path).then(
      (md) => live && setState({ path, tokens: lex(md), minutes: readingMinutes(md) }),
      () => live && setState({ path, error: 'Não foi possível abrir este documento no GitHub.' }),
    );
    return () => {
      live = false;
    };
  }, [path]);
  const loaded = state && state.path === path ? state : null;
  const toc = useMemo(() => (loaded && 'tokens' in loaded ? headings(loaded.tokens) : []), [loaded]);

  // a new document starts at the top, or at the heading a link asked for
  useEffect(() => {
    if (!loaded || !('tokens' in loaded)) return;
    if (heading) requestAnimationFrame(() => scrollToId(heading));
    else scrollTo({ top: 0 });
  }, [loaded, heading]);

  const parts = path.split('/');
  return (
    <>
      <article className="mcontent" aria-busy={!loaded}>
        <div className="crumbs">
          <span className="mono">
            {REPO}
            {parts.map((p, i) => (
              <span key={i}>
                <span className="crumbs__sep" aria-hidden="true">›</span>
                {p}
              </span>
            ))}
          </span>
          <a className="crumbs__gh" href={BLOB + path} target="_blank" rel="noopener noreferrer">
            Abrir no GitHub
            <Icon name="external" />
          </a>
        </div>
        {!loaded || !ready ? (
          <div className="skeleton" aria-label="Carregando">
            <i style={{ width: '60%', height: 40 }} />
            <i style={{ width: '30%' }} />
            <i />
            <i />
            <i style={{ width: '80%' }} />
          </div>
        ) : 'error' in loaded ? (
          <Notice tone="error">{loaded.error}</Notice>
        ) : (
          <div className="doc" key={path}>
            <Markdown
              tokens={loaded.tokens}
              path={path}
              docs={docs}
              onAnchor={scrollToId}
              wrap={(tokens, render) => {
                // the first h1 becomes the page title, with the file and reading time under it
                const i = tokens.findIndex((t) => t.type === 'heading' && (t as { depth: number }).depth === 1);
                if (i < 0) return render(tokens);
                return (
                  <>
                    {render(tokens.slice(0, i + 1))}
                    <p className="doc__meta">
                      {path} · {loaded.minutes} min de leitura
                    </p>
                    <Toc items={toc} />
                    {render(tokens.slice(i + 1))}
                  </>
                );
              }}
            />
          </div>
        )}
      </article>
      <div className="mtoc">{loaded && 'tokens' in loaded && <Toc items={toc} />}</div>
    </>
  );
}

/** Searches every document (fetched the first time someone searches) and lists the lines that match. */
function SearchResults({ catalog, query }: { catalog: DocEntry[]; query: string }) {
  const [texts, setTexts] = useState<Map<string, string> | null>(null);
  const [q, setQ] = useState(query);
  useEffect(() => {
    const id = setTimeout(() => setQ(query), 160);
    return () => clearTimeout(id);
  }, [query]);
  useEffect(() => {
    let live = true;
    Promise.all(catalog.map((d) => fetchFile(d.path).then((t) => [d.path, t] as const, () => [d.path, ''] as const))).then((all) => {
      if (live) setTexts(new Map(all));
    });
    return () => {
      live = false;
    };
  }, [catalog]);
  if (!texts) return <p className="side__empty">Lendo os documentos…</p>;
  const results = catalog
    .map((d) => ({ d, hits: searchText(d.path, texts.get(d.path) ?? '', q, 3) as SearchHit[] }))
    .filter((r) => r.hits.length);
  if (!results.length) return <p className="side__empty">Nada encontrado para “{q}”.</p>;
  return (
    <div className="results" role="list">
      {results.map(({ d, hits }) => (
        <a key={d.path} href={`#/docs/${d.path}`} className="result" role="listitem">
          <b>{d.label}</b>
          {hits.map((h) => (
            <span key={h.line} className="result__line">
              {h.snippet.slice(0, h.at)}
              <mark>{h.snippet.slice(h.at, h.at + h.length)}</mark>
              {h.snippet.slice(h.at + h.length)}
            </span>
          ))}
        </a>
      ))}
    </div>
  );
}
