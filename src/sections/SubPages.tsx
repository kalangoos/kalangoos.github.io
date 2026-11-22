import { Icon } from '../components/Icon';
import { Checks, Eyebrow } from '../components/Bits';
import { useSite } from '../lib/context';
import { PAGES, type PageId } from '../lib/routes';
import type { Block, Item, SubPageId } from '../content';

/** "@id" in a link means another page of the site, in the visitor's language. */
function useHref() {
  const { lang } = useSite();
  return (href: string) => (href.startsWith('@') ? PAGES[href.slice(1) as PageId][lang] : href);
}

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  const resolve = useHref();
  const url = resolve(href);
  return (
    <a href={url} {...(url.startsWith('http') ? { rel: 'noopener' } : {})}>
      {children}
      <Icon name="chev" />
    </a>
  );
}

function BlockHead({ title }: { title?: string }) {
  return title ? (
    <header className="head reveal">
      <h2 className="display">{title}</h2>
    </header>
  ) : null;
}

function asItems(b: Block): Item[] {
  return (b.items ?? []).filter((x): x is Item => typeof x !== 'string');
}
function asStrings(b: Block): string[] {
  return (b.items ?? []).filter((x): x is string => typeof x === 'string');
}

function Notice({ b }: { b: Block }) {
  return (
    <div className={`notice notice--${b.tone ?? 'info'} reveal`}>
      <Icon name={b.tone === 'warn' ? 'alert' : 'info'} />
      <span>
        {b.text}
        {b.link && (
          <>
            {' '}
            <Ext href={b.link.href}>{b.link.label}</Ext>
          </>
        )}
      </span>
    </div>
  );
}

function Body({ b, pending }: { b: Block; pending?: string }) {
  const { lang } = useSite();
  switch (b.kind) {
    case 'text':
      return (
        <div className="prose reveal">
          {(b.paras ?? []).map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      );
    case 'cards':
      return (
        <ul className="grid grid--auto">
          {asItems(b).map((c, k) => (
            <li key={c.title} className="card reveal" style={{ '--i': k } as React.CSSProperties}>
              {c.badge && <span className="badge badge--gold">{c.badge}</span>}
              <h3 className={c.title?.includes('.') && !c.title.includes(' ') ? 'mono' : undefined}>{c.title}</h3>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>
      );
    case 'checks':
      return (
        <div className="reveal">
          <Checks items={pending && b.tone === 'coral' ? [...asStrings(b), pending] : asStrings(b)} icon={b.tone === 'coral' ? 'alert' : b.tone === 'gold' ? 'clock' : 'check'} tone={(b.tone as 'teal' | 'coral' | 'gold') ?? 'teal'} />
        </div>
      );
    case 'steps':
      return (
        <div className="next">
          <ol>
            {asItems(b).map((s, k) => (
              <li key={s.title} className="reveal" style={{ '--i': k } as React.CSSProperties}>
                <span className="next__n" aria-hidden="true">{k + 1}</span>
                <span className="step__body">
                  <b>{s.title}</b>
                  {s.text && <p>{s.text}</p>}
                  {s.code && (
                    <pre className="code" tabIndex={0}>
                      <code>{s.code}</code>
                    </pre>
                  )}
                  {s.link && (
                    <p className="links">
                      <Ext href={s.link.href}>{s.link.label}</Ext>
                    </p>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      );
    case 'links':
      return (
        <ul className="grid grid--auto">
          {asItems(b).map((l, k) => (
            <li key={l.label} className="card card--link reveal" style={{ '--i': k } as React.CSSProperties}>
              <h3>
                <Ext href={l.href ?? '#'}>{l.label}</Ext>
              </h3>
              {l.text && <p>{l.text}</p>}
            </li>
          ))}
        </ul>
      );
    case 'todo':
      return (
        <div className="card card--cloud reveal">
          <p className="row">
            <span className="badge badge--gold">{lang === 'en' ? 'To confirm' : 'A confirmar'}</span>
          </p>
          <ul className="checks checks--gold checks--sm">
            {asStrings(b).map((x) => (
              <li key={x}>
                <Icon name="clock" />
                <span>{x}</span>
              </li>
            ))}
          </ul>
          {b.note && <p>{b.note}</p>}
        </div>
      );
    default:
      return null;
  }
}

export function SubPage({ id }: { id: SubPageId }) {
  const { t } = useSite();
  const P = t.pages[id];
  // notices that open the page sit under the lead; the rest are sections
  let lead = 0;
  while (P.blocks[lead]?.kind === 'notice') lead++;
  const rest = P.blocks.slice(lead);
  return (
    <>
      <section className="section page-head" aria-labelledby="page-title">
        <div className="container">
          <header className="head">
            <Eyebrow>{P.eyebrow}</Eyebrow>
            <h1 id="page-title" className="display">{P.h1}</h1>
            <p className="lead">{P.lead}</p>
          </header>
          {P.blocks.slice(0, lead).map((b, k) => (
            <Notice key={k} b={b} />
          ))}
        </div>
      </section>
      {rest.map((b, k) =>
        b.kind === 'notice' ? (
          <section key={k} className="section section--tight"><div className="container"><Notice b={b} /></div></section>
        ) : (
          <section key={k} className={`section${k % 2 === 0 ? ' section--base' : ''}`} aria-label={b.title}>
            <div className="container">
              <BlockHead title={b.title} />
              <Body b={b} pending={P.pending} />
            </div>
          </section>
        ),
      )}
    </>
  );
}

export function NotFoundPage() {
  const { t } = useSite();
  const N = t.pages.notfound;
  return (
    <section className="section page-head" aria-labelledby="page-title">
      <div className="container">
        <header className="head">
          <Eyebrow>{N.eyebrow}</Eyebrow>
          <h1 id="page-title" className="display">{N.h1}</h1>
          <p className="lead">{N.lead}</p>
        </header>
        <p className="links">
          <a className="btn btn--primary" href="/">{N.home}</a>
        </p>
        <div className="head" lang={N.other.lang}>
          <h2 className="display">{N.other.h}</h2>
          <p className="lead">{N.other.text}</p>
          <p className="links">
            <a className="btn btn--secondary" href={N.other.href}>{N.other.home}</a>
          </p>
        </div>
      </div>
    </section>
  );
}
