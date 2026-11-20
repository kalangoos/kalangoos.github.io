import { Fragment, createElement, type ReactNode } from 'react';
import { Lexer, type Token, type Tokens } from 'marked';
import { imageSrc, linkTarget, slugify } from './repo';

/**
 * Markdown from the repository as React elements. Only the lexer of `marked` is used: every token becomes a component,
 * so raw HTML in a document shows as text and never runs (no dangerouslySetInnerHTML).
 */
export type Heading = { depth: number; text: string; id: string };

type Ctx = { path: string; docs: Set<string>; ids: Map<string, number>; onAnchor: (id: string) => void };

const plain = (tokens: Token[] | undefined): string =>
  (tokens ?? [])
    .map((t) => ('tokens' in t && t.tokens ? plain(t.tokens) : 'text' in t ? String(t.text) : ''))
    .join('');

function uniqueId(ctx: Ctx, text: string): string {
  const base = slugify(text) || 'secao';
  const n = ctx.ids.get(base) ?? 0;
  ctx.ids.set(base, n + 1);
  return n ? `${base}-${n}` : base;
}

export function lex(md: string): Token[] {
  return new Lexer({ gfm: true }).lex(md);
}

/** h2 and h3 of a document, with the ids the renderer gives them (for "Nesta página"). */
export function headings(tokens: Token[]): Heading[] {
  const ctx: Ctx = { path: '', docs: new Set(), ids: new Map(), onAnchor: () => undefined };
  const out: Heading[] = [];
  for (const t of tokens) {
    if (t.type !== 'heading') continue;
    const text = plain((t as Tokens.Heading).tokens);
    const id = uniqueId(ctx, text);
    if ((t as Tokens.Heading).depth === 2 || (t as Tokens.Heading).depth === 3) out.push({ depth: (t as Tokens.Heading).depth, text, id });
  }
  return out;
}

const ALERTS: Record<string, string> = { note: 'Nota', tip: 'Dica', important: 'Importante', warning: 'Atenção', caution: 'Cuidado' };

// Raw HTML in the documents (the README's centred header, badges and links): parsed by the browser's DOMParser,
// which runs nothing, and rebuilt as React elements from a closed list of tags and attributes. Anything else
// (script, style, iframe, event handlers, unknown attributes) is dropped.
const HTML_TAGS = new Set(['p', 'div', 'span', 'a', 'img', 'br', 'b', 'strong', 'i', 'em', 'code', 'kbd', 'sub', 'sup', 'small', 'del', 's',
  'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'hr', 'blockquote', 'details', 'summary', 'picture', 'table', 'thead', 'tbody', 'tr', 'td', 'th']);
const HTML_DROP = new Set(['script', 'style', 'iframe', 'object', 'embed', 'template', 'noscript', 'form', 'input', 'button', 'svg', 'math', 'source']);

function htmlBlock(html: string, ctx: Ctx): ReactNode {
  if (typeof DOMParser === 'undefined') return null; // server render: the documents only render in the browser
  const doc = new DOMParser().parseFromString(`<!doctype html><body>${html}</body>`, 'text/html');
  return Array.from(doc.body.childNodes).map((n, i) => htmlNode(n, ctx, i));
}

function htmlNode(n: Node, ctx: Ctx, key: number): ReactNode {
  if (n.nodeType === Node.TEXT_NODE) return n.textContent;
  if (n.nodeType !== Node.ELEMENT_NODE) return null;
  const el = n as Element;
  const tag = el.tagName.toLowerCase();
  if (HTML_DROP.has(tag)) return null;
  const kids = Array.from(el.childNodes).map((c, i) => htmlNode(c, ctx, i));
  if (!HTML_TAGS.has(tag)) return <Fragment key={key}>{kids}</Fragment>;
  const props: Record<string, unknown> = { key };
  const align = el.getAttribute('align');
  if (align && /^(center|left|right)$/i.test(align)) props.className = `md-align-${align.toLowerCase()}`;
  if (tag === 'a') {
    const href = el.getAttribute('href') ?? '';
    const to = linkTarget(ctx.path, href, ctx.docs);
    if (to.kind === 'anchor') {
      props.href = `#${to.href}`;
      props.onClick = (e: React.MouseEvent) => {
        e.preventDefault();
        ctx.onAnchor(to.href);
      };
    } else if (to.href) {
      props.href = to.href;
      if (to.kind === 'external') Object.assign(props, { target: '_blank', rel: 'noopener noreferrer' });
    }
  }
  if (tag === 'img') {
    const src = imageSrc(ctx.path, el.getAttribute('src') ?? '');
    if (!src) return el.getAttribute('alt');
    props.src = src;
    props.alt = el.getAttribute('alt') ?? '';
    props.loading = 'lazy';
    for (const k of ['width', 'height']) {
      const v = el.getAttribute(k);
      if (v && /^\d{1,4}$/.test(v)) props[k] = Number(v);
    }
    return createElement('img', props);
  }
  if (tag === 'br' || tag === 'hr') return createElement(tag, props);
  if (tag === 'details' && el.hasAttribute('open')) props.open = true;
  return createElement(tag, props, ...kids);
}

function inline(tokens: Token[] | undefined, ctx: Ctx): ReactNode {
  return (tokens ?? []).map((t, i) => <Fragment key={i}>{inlineOne(t, ctx)}</Fragment>);
}

function inlineOne(t: Token, ctx: Ctx): ReactNode {
  switch (t.type) {
    case 'text':
      return (t as Tokens.Text).tokens ? inline((t as Tokens.Text).tokens, ctx) : (t as Tokens.Text).text;
    case 'escape':
      return (t as Tokens.Escape).text;
    case 'strong':
      return <strong>{inline((t as Tokens.Strong).tokens, ctx)}</strong>;
    case 'em':
      return <em>{inline((t as Tokens.Em).tokens, ctx)}</em>;
    case 'del':
      return <del>{inline((t as Tokens.Del).tokens, ctx)}</del>;
    case 'codespan':
      return <code>{(t as Tokens.Codespan).text}</code>;
    case 'br':
      return <br />;
    case 'link': {
      const l = t as Tokens.Link;
      const to = linkTarget(ctx.path, l.href, ctx.docs);
      if (to.kind === 'anchor')
        return (
          <a
            href={`#${to.href}`}
            onClick={(e) => {
              e.preventDefault();
              ctx.onAnchor(to.href);
            }}
          >
            {inline(l.tokens, ctx)}
          </a>
        );
      if (to.kind === 'external' && !to.href) return inline(l.tokens, ctx);
      if (to.kind === 'external')
        return (
          <a href={to.href} target="_blank" rel="noopener noreferrer">
            {inline(l.tokens, ctx)}
          </a>
        );
      return <a href={to.href}>{inline(l.tokens, ctx)}</a>;
    }
    case 'image': {
      const im = t as Tokens.Image;
      const src = imageSrc(ctx.path, im.href);
      return src ? <img src={src} alt={im.text} loading="lazy" /> : im.text;
    }
    case 'html':
      // inline tags arrive one by one (<kbd>, text, </kbd>): keep line breaks, drop the tags themselves
      return /^<br\s*\/?>$/i.test((t as Tokens.HTML).text.trim()) ? <br /> : null;
    default:
      return 'raw' in t ? String(t.raw) : null;
  }
}

function block(t: Token, ctx: Ctx, key: number): ReactNode {
  switch (t.type) {
    case 'space':
      return null;
    case 'heading': {
      const h = t as Tokens.Heading;
      const id = uniqueId(ctx, plain(h.tokens));
      const Tag = `h${Math.min(6, h.depth)}` as 'h1';
      return (
        <Tag key={key} id={id}>
          {inline(h.tokens, ctx)}
        </Tag>
      );
    }
    case 'paragraph':
      return <p key={key}>{inline((t as Tokens.Paragraph).tokens, ctx)}</p>;
    case 'text':
      return <p key={key}>{inline((t as Tokens.Text).tokens ?? [t], ctx)}</p>;
    case 'hr':
      return <hr key={key} />;
    case 'blockquote': {
      const bq = t as Tokens.Blockquote;
      const alert = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*\n?/i.exec(bq.text);
      if (alert) {
        const kind = alert[1]!.toLowerCase();
        return (
          <aside key={key} className={`callout callout--${kind}`}>
            <p className="callout__title">{ALERTS[kind]}</p>
            {blocks(lex(bq.text.slice(alert[0].length)), ctx)}
          </aside>
        );
      }
      return <blockquote key={key}>{blocks(bq.tokens, ctx)}</blockquote>;
    }
    case 'code': {
      const c = t as Tokens.Code;
      return (
        <pre key={key} data-lang={c.lang || undefined}>
          <code>{c.text}</code>
        </pre>
      );
    }
    case 'list': {
      const l = t as Tokens.List;
      const items = l.items.map((it, i) => (
        <li key={i} className={it.task ? 'task' : undefined}>
          {it.task && <span className={`task__box${it.checked ? ' is-done' : ''}`} role="img" aria-label={it.checked ? 'feito' : 'a fazer'} />}
          {it.loose ? blocks(it.tokens.filter((x) => x.type !== 'checkbox'), ctx) : inlineList(it.tokens, ctx)}
        </li>
      ));
      return l.ordered ? (
        <ol key={key} start={typeof l.start === 'number' && l.start !== 1 ? l.start : undefined}>
          {items}
        </ol>
      ) : (
        <ul key={key}>{items}</ul>
      );
    }
    case 'table': {
      const tb = t as Tokens.Table;
      const align = (a: string | null) => (a ? { textAlign: a as 'left' } : undefined);
      return (
        <div key={key} className="md-table">
          <table>
            <thead>
              <tr>
                {tb.header.map((h, i) => (
                  <th key={i} style={align(tb.align[i] ?? null)}>
                    {inline(h.tokens, ctx)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tb.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((c, j) => (
                    <td key={j} style={align(tb.align[j] ?? null)}>
                      {inline(c.tokens, ctx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'html':
      return <Fragment key={key}>{htmlBlock((t as Tokens.HTML).text, ctx)}</Fragment>;
    default:
      return 'tokens' in t && t.tokens ? <p key={key}>{inline(t.tokens, ctx)}</p> : null;
  }
}

/** Tight list items: their text tokens inline, nested lists as blocks. */
function inlineList(tokens: Token[], ctx: Ctx): ReactNode {
  return tokens
    .filter((x) => x.type !== 'checkbox')
    .map((x, i) =>
      x.type === 'text' ? <Fragment key={i}>{inline((x as Tokens.Text).tokens ?? [x], ctx)}</Fragment> : <Fragment key={i}>{block(x, ctx, i)}</Fragment>,
    );
}

function blocks(tokens: Token[], ctx: Ctx): ReactNode {
  return tokens.map((t, i) => block(t, ctx, i));
}

export function Markdown({
  tokens,
  path,
  docs,
  onAnchor,
  wrap,
}: {
  tokens: Token[];
  path: string;
  docs: Set<string>;
  onAnchor: (id: string) => void;
  /** Optional: groups the rendered blocks (the spec view turns "### Requirement" sections into cards). */
  wrap?: (tokens: Token[], render: (ts: Token[]) => ReactNode) => ReactNode;
}) {
  const ctx: Ctx = { path, docs, ids: new Map(), onAnchor };
  const render = (ts: Token[]) => blocks(ts, ctx);
  return <div className="md">{wrap ? wrap(tokens, render) : render(tokens)}</div>;
}

/** One line of inline Markdown (task texts): code, emphasis and links; links open on GitHub. */
export function InlineMd({ text, path = '' }: { text: string; path?: string }) {
  const ctx: Ctx = { path, docs: new Set(), ids: new Map(), onAnchor: () => undefined };
  return <>{inline(Lexer.lexInline(text, { gfm: true }), ctx)}</>;
}
