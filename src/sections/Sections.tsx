import type { CSSProperties } from 'react';
import { Icon } from '../components/Icon';
import { ApprovalCard, StepRow } from '../components/AgentPanel';
import { Capture, Checks, Eyebrow, SectionHead } from '../components/Bits';
import { SpringLab } from '../components/SpringLab';
import { useSite } from '../lib/context';
import { PAGES, type PageId } from '../lib/routes';

const i = (n: number) => ({ '--i': n }) as CSSProperties;

export function Promises() {
  const { t } = useSite();
  return (
    <section className="section" style={{ paddingTop: 'clamp(40px, 5vw, 72px)', paddingBottom: 'clamp(16px, 2vw, 32px)' }} aria-labelledby="summary-title">
      <div className="container">
        <h2 className="visually-hidden" id="summary-title">{t.a11y.summary}</h2>
        <ul className="grid">
          {t.promises.map((p, k) => (
            <li key={p.title} className="card reveal" style={i(k)}>
              <span className="icon-tile"><Icon name={p.icon} /></span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Undo() {
  const { t } = useSite();
  const U = t.undo;
  return (
    <section className="section section--base" id="undo" aria-labelledby="undo-title">
      <div className="container">
        <div className="cols">
          <div className="stack-v" style={{ gap: 28 }}>
            <header className="head reveal">
              <Eyebrow>{U.eyebrow}</Eyebrow>
              <h2 className="display" id="undo-title">{U.title}</h2>
              <p className="lead">{U.lead}</p>
            </header>
            <div className="reveal"><Checks items={U.points} /></div>
            <p className="notice reveal"><Icon name="check" /><span>{U.proof}</span></p>
          </div>
          <div className="card flow reveal">
            <h3>{U.flowTitle}</h3>
            <ol className="stack-v" style={{ gap: 10 }}>
              {U.flow.map((s, k) => (
                <StepRow key={s.title} title={`${k + 1}. ${s.title}`} detail={s.detail} waiting={k === 2} />
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Privacy() {
  const { t } = useSite();
  const P = t.privacy;
  return (
    <section className="section" id="privacy" aria-labelledby="privacy-title">
      <div className="container">
        <SectionHead eyebrow={P.eyebrow} title={P.title} lead={P.lead} />
        <div className="cols cols--privacy">
          <Capture shot={P.shots[0].shot} alt={P.shots[0].alt} caption={P.shots[0].caption} />
          <div className="stack-v">
            <ul className="grid grid--2">
              {P.points.map((p, k) => (
                <li key={p.title} className="card mini reveal" style={i(k)}>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </li>
              ))}
            </ul>
            <div className="card card--cloud reveal">
              <p className="row">
                <span className="badge badge--gold">{P.cloud.badge}</span>
                <b>{P.cloud.title}</b>
              </p>
              <p>{P.cloud.text}</p>
            </div>
            <Capture shot={P.shots[1].shot} alt={P.shots[1].alt} caption={P.shots[1].caption} sizes="(max-width: 960px) 100vw, 1280px" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function Security() {
  const { t } = useSite();
  const S = t.security;
  const tones = ['c-teal', 'c-blue', 'c-gold', 'c-coral'];
  return (
    <section className="section section--base" id="security" aria-labelledby="security-title">
      <div className="container">
        <SectionHead eyebrow={S.eyebrow} title={S.title} lead={S.lead} />
        <div className="layers">
          <h3 className="reveal">{S.layersTitle}</h3>
          {S.layers.map((l, k) => (
            <div key={l.title} className="layer reveal" style={i(k)}>
              <span className="layer__name"><span className="mono">{4 - k}</span>{l.title}</span>
              <p>{l.text}</p>
            </div>
          ))}
        </div>
        <div className="stack-v" style={{ gap: 12 }}>
          <h3 className="label reveal">{S.levelsTitle}</h3>
          <ul className="grid grid--4">
            {S.levels.map((l, k) => (
              <li key={l.n} className="card level reveal" style={i(k)}>
                <span className="level__top">
                  <span className={`level__n ${tones[k]}`}>{l.n}</span>
                  <b>{l.title}</b>
                </span>
                <p>{l.text}</p>
                <span className="level__grant">
                  <Icon name={k === 3 ? 'lock' : 'check'} className={`icon ${tones[k]}`} />
                  {l.grant}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="cols cols--security">
          <div className="card card--injection reveal">
            <p className="row"><Icon name="alert" /><b>{S.injection.title}</b></p>
            <p>{S.injection.text}</p>
          </div>
          <div className="card reveal">
            <h3>{S.approval.title}</h3>
            <p>{S.approval.text}</p>
            <ApprovalCard a={t.hero.panel.approval} />
          </div>
        </div>
        <div className="cols cols--install">
          <Capture shot="install-agent" alt={S.install.alt} caption={S.install.caption} sizes="(max-width: 960px) 100vw, 60vw" />
          <div className="status reveal">
            <h3>{S.statusTitle}</h3>
            <Checks items={[S.done]} small />
            <Checks items={[S.planned]} icon="clock" tone="gold" small />
            <p className="disclosure">{S.disclosure}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Platform() {
  const { t } = useSite();
  const P = t.platform;
  return (
    <section className="section section--base" id="platform" aria-labelledby="platform-title">
      <div className="container">
        <SectionHead eyebrow={P.eyebrow} title={P.title} lead={P.lead} />
        <ul className="grid">
          {P.items.map((f, k) => (
            <li key={f.title} className="feature reveal" style={i(k)}>
              <span className="icon-tile"><Icon name={f.icon} /></span>
              <span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </span>
            </li>
          ))}
        </ul>
        <p className="note reveal">{P.note}</p>
      </div>
    </section>
  );
}

export function Desktop() {
  const { t } = useSite();
  const D = t.desktop;
  return (
    <section className="section" id="desktop" aria-labelledby="desktop-title">
      <div className="container">
        <SectionHead eyebrow={D.eyebrow} title={D.title} lead={D.lead} />
        <ul className="grid">
          {D.features.map((f, k) => (
            <li key={f.title} className="feature reveal" style={i(k)}>
              <span className="icon-tile"><Icon name={f.icon} /></span>
              <span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </span>
            </li>
          ))}
        </ul>
        <div className="grid grid--shots">
          {D.bento.map((b) => (
            <Capture key={b.shot} shot={b.shot} alt={b.alt} caption={b.caption} />
          ))}
        </div>
        <div className="card apps reveal">
          <h3>{D.appsTitle}</h3>
          <p>{D.appsLead}</p>
          <ul className="apps__grid">
            {D.apps.map((a) => (
              <li key={a.icon} className="app">
                <img src={`/img/apps/${a.icon}.webp`} width="64" height="64" alt="" loading="lazy" />
                {a.name}
              </li>
            ))}
          </ul>
        </div>
        <SpringLab />
      </div>
    </section>
  );
}

export function Gallery() {
  const { t } = useSite();
  const G = t.gallery;
  return (
    <section className="section section--base" id="gallery" aria-labelledby="gallery-title">
      <div className="container">
        <SectionHead eyebrow={G.eyebrow} title={G.title} lead={G.lead} />
        <div className="grid grid--shots">
          {G.items.map((g) => (
            <Capture key={g.shot} shot={g.shot} alt={g.alt} caption={g.caption} fit={g.shot === 'first-use'} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function DesignSystem() {
  const { t } = useSite();
  const D = t.designSystem;
  return (
    <section className="section section--base" id="design" aria-labelledby="design-title">
      <div className="container">
        <SectionHead eyebrow={D.eyebrow} title={D.title} lead={D.lead} />
        <div className="grid grid--shots">
          {D.items.map((g) => (
            <Capture key={g.shot} shot={g.shot} alt={g.alt} caption={g.caption} />
          ))}
        </div>
        <p className="design-cta reveal">
          <a className="btn btn--secondary" href={D.cta.href} target="_blank" rel="noopener noreferrer">
            {D.cta.label}
          </a>
          <span className="design-cta__text">{D.cta.text}</span>
        </p>
      </div>
    </section>
  );
}

export function Stack() {
  const { t } = useSite();
  const S = t.stack;
  return (
    <section className="section" id="stack" aria-labelledby="stack-title">
      <div className="container">
        <SectionHead eyebrow={S.eyebrow} title={S.title} lead={S.lead} />
        <ul className="grid">
          {S.groups.map((g, k) => (
            <li key={g.title} className="card stack-card reveal" style={i(k)}>
              <h3>{g.title}</h3>
              <ul>
                {g.items.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        <p className="note reveal">{S.note}</p>
      </div>
    </section>
  );
}

export function Roadmap() {
  const { t } = useSite();
  const R = t.roadmap;
  return (
    <section className="section section--base" id="roadmap" aria-labelledby="roadmap-title">
      <div className="container">
        <SectionHead eyebrow={R.eyebrow} title={R.title} extra={<p className="updated">{R.updated}</p>} />
        <div className="cols cols--even">
          <div className="card reveal">
            <h3>{R.existsTitle}</h3>
            <Checks items={R.exists} small />
          </div>
          <div className="card reveal" style={i(1)}>
            <h3>{R.missingTitle}</h3>
            <Checks items={R.missing} icon="close" tone="coral" small />
          </div>
        </div>
        <div className="next">
          <h3 className="reveal">{R.nextTitle}</h3>
          <ol>
            {R.next.map((s, k) => (
              <li key={s.title} className="reveal" style={i(k)}>
                <span className="next__n" aria-hidden="true">{k + 1}</span>
                <span>
                  <b>{s.title}</b>
                  <p>{s.text}</p>
                </span>
              </li>
            ))}
          </ol>
          <p className="rule reveal"><Icon name="info" /><span>{R.rule}</span></p>
        </div>
        <div className="card reveal">
          <h3>{R.ideas.title}</h3>
          <p>{R.ideas.text}</p>
          <p className="links">
            {R.ideas.links.map((l) => (
              <a key={l.href} href={l.href} rel="noopener">{l.label}<Icon name="chev" /></a>
            ))}
          </p>
        </div>
        <div className="milestones">
          <div className="milestones__head reveal">
            <h3>{R.milestonesTitle}</h3>
            <p>{R.milestonesNote}</p>
          </div>
          <ol className="grid grid--5">
            {R.milestones.map((m, k) => (
              <li key={m.v} className="card milestone reveal" style={i(k)}>
                <span className="v">{m.v}</span>
                <b>{m.name}</b>
                <p>{m.text}</p>
                <small>{m.who}</small>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  const { t } = useSite();
  const F = t.faq;
  return (
    <section className="section" id="faq" aria-labelledby="faq-title">
      <div className="container">
        <SectionHead eyebrow={F.eyebrow} title={F.title} />
        <div className="faq reveal">
          {F.items.map((it, k) => (
            <details key={it.q} open={k === 0}>
              <summary>
                {it.q}
                <Icon name="chev" />
              </summary>
              <p className="answer">{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Follow() {
  const { t } = useSite();
  const F = t.follow;
  return (
    <section className="section" id="follow" aria-labelledby="follow-title" style={{ paddingTop: 0 }}>
      <div className="container">
        <div className="follow reveal">
          <div className="follow__logo">
            <img className="dark" src="/img/brand/badge.webp" width="240" height="245" alt="KalangoOS" loading="lazy" />
            <img className="light" src="/img/brand/badge-light.webp" width="240" height="247" alt="KalangoOS" loading="lazy" />
          </div>
          <div className="follow__text">
            <Eyebrow>{F.eyebrow}</Eyebrow>
            <h2 className="display" id="follow-title">{F.title}</h2>
            <p>{F.text}</p>
            <p className="links">
              {F.links.map((l) => (
                <a key={l.href} href={l.href} {...(l.href.startsWith('http') ? { rel: 'noopener' } : {})}>{l.label}<Icon name="chev" /></a>
              ))}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  const { t, lang } = useSite();
  const F = t.footer;
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__top">
          <span className="footer__brand">
            <img src="/img/brand/symbol.webp" width="26" height="28" alt="" />
            KalangoOS
            <span className="mono">kalangoos.com</span>
          </span>
          <span className="footer__status">{F.status}</span>
        </div>
        <nav className="footer__nav" aria-label={t.a11y.pages}>
          {t.pagesNav.map((p) => (
            <a key={p.id} href={PAGES[p.id as PageId][lang]}>{p.label}</a>
          ))}
          <a href="https://github.com/kalangoos/kalangoos" rel="noopener">GitHub</a>
        </nav>
        <p>{F.license}</p>
        <p>{F.ai}</p>
        <p>{F.captures}</p>
        <p>{F.fonts}</p>
      </div>
    </footer>
  );
}
