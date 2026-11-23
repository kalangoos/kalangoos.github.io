import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import '../styles/landing.css';
import { Icon } from '../components/Icon';
import { ShotImages } from '../components/Bits';
import { useSite } from '../lib/context';
import { pathOf, type PageId } from '../lib/routes';
import { useScrollSpy } from '../lib/useReveal';
import { LINKS } from './media';
import { Clip, Tour } from './Media';
import { currentTheme, idx, tone, switchTheme, useIndicator, useLandingReveal, useMounted, useNavScrolled } from './motion';

/** "@page" → that page in the current language; "#id", "/x/" and "https://…" as they are; "" → not known yet. */
function useHref() {
  const { lang, page } = useSite();
  return useCallback(
    (h: string) => (h.startsWith('@') ? pathOf(lang, h.slice(1) as PageId) : h.startsWith('#') && page !== 'home' ? pathOf(lang, 'home') + h : h),
    [lang, page],
  );
}
const external = (h: string) => (h.startsWith('http') ? { rel: 'noopener' } : {});

/** A link, or "coming soon" text when the address is not known yet (Discord, YouTube, donations). */
function MaybeLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const { t } = useSite();
  const to = useHref();
  if (!href) {
    return (
      <span className={`${className ?? ''} is-soon`} aria-disabled="true">
        {children} <em className="lv-soon">{t.landing.community.soon}</em>
      </span>
    );
  }
  return (
    <a className={className} href={to(href)} {...external(href)}>
      {children}
    </a>
  );
}

function Btn({ href, kind = 'accent', small, children, icon }: { href: string; kind?: 'accent' | 'ghost'; small?: boolean; children: ReactNode; icon?: string }) {
  return (
    <a className={`lv-btn lv-btn--${kind}${small ? ' lv-btn--sm' : ''}`} href={href} {...external(href)}>
      <span className="lv-btn__label">
        {children}
        {icon && <Icon name={icon} className="icon lv-btn__icon" />}
      </span>
    </a>
  );
}

function Label({ children, tone: tn, dot = true }: { children: ReactNode; tone?: string; dot?: boolean }) {
  return (
    <p className={`lv-label lv-r${tn ? ' lv-label--tone' : ''}`} style={tn ? { ['--tone' as string]: tone(tn) } : undefined}>
      {dot && <span className="lv-label__dot" aria-hidden="true" />}
      {children}
    </p>
  );
}

function Wordmark() {
  return (
    <span className="lv-wordmark" aria-hidden="true">
      <span className="lv-wordmark__name">KALANGO</span>
      <span className="lv-wordmark__os">OS</span>
    </span>
  );
}

function Symbol({ size }: { size: number }) {
  const w = Math.round((size * 115) / 128);
  return (
    <>
      <img className="lv-symbol only-dark" src="/img/brand/symbol.webp" width={w} height={size} alt="" />
      <img className="lv-symbol only-light" src="/img/brand/symbol-light.webp" width={w} height={size} alt="" />
    </>
  );
}

/* ------------------------------------------------------------------ announcement + nav */

function ThemeButton() {
  const { t } = useSite();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => setTheme(currentTheme()), []);
  const label = theme === 'dark' ? t.a11y.themeToLight : t.a11y.themeToDark;
  return (
    <button type="button" className="lv-icon-btn lv-theme" onClick={() => setTheme(switchTheme())} aria-label={label} title={label}>
      <Icon name="sun" className="icon when-dark" />
      <Icon name="moon" className="icon when-light" />
    </button>
  );
}

/** The same page in the other language (the home keeps the section in view; the 404 offers the home). */
function LangSwitch() {
  const { t, lang, page } = useSite();
  const target: PageId = page === 'notfound' ? 'home' : page;
  const keepHash = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (page === 'home' && location.hash) e.currentTarget.href = e.currentTarget.pathname + location.hash;
  };
  return (
    <nav className="lv-lang" aria-label={t.a11y.language}>
      <a href={pathOf('pt-BR', target)} hrefLang="pt-BR" lang="pt-BR" aria-current={lang === 'pt-BR' ? 'true' : undefined} onClick={keepHash}>
        <span aria-hidden="true">PT</span>
        <span className="visually-hidden">Português</span>
      </a>
      <a href={pathOf('en', target)} hrefLang="en" lang="en" aria-current={lang === 'en' ? 'true' : undefined} onClick={keepHash}>
        <span aria-hidden="true">EN</span>
        <span className="visually-hidden">English</span>
      </a>
    </nav>
  );
}

function Nav() {
  const { t, lang, page } = useSite();
  const L = t.landing.nav;
  // on the other pages the section links go back to the home page
  const base = page === 'home' ? '' : pathOf(lang, 'home');
  const head = useRef<HTMLElement>(null);
  const row = useRef<HTMLDivElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  const [active, setActive] = useState('');
  const ids = useMemo(() => (page === 'home' ? L.items.map((n) => n.id) : []), [L, page]);
  const set = useCallback((id: string) => setActive(id), []);
  useScrollSpy(ids, set);
  useNavScrolled(head);
  useIndicator(row, ind, L.items.findIndex((n) => n.id === active));
  const closeMenu = (e: React.MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('a')) e.currentTarget.closest('details')?.removeAttribute('open');
  };

  return (
    <header className="lv-nav" ref={head}>
      <div className="lv-nav__bg" aria-hidden="true" />
      <div className="lv-wrap lv-nav__row">
        <a className="lv-brand" href={`${pathOf(lang, 'home')}#top`} aria-label="KalangoOS">
          <Symbol size={44} />
          <Wordmark />
        </a>
        <nav className="lv-nav__links" aria-label={L.label}>
          <div className="lv-nav__list" ref={row}>
            <ul>
              {L.items.map((n) => (
                <li key={n.id}>
                  <a href={`${base}#${n.id}`} data-ind-item="" aria-current={active === n.id ? 'true' : undefined}>
                    {n.label}
                  </a>
                </li>
              ))}
            </ul>
            <span className="lv-ind lv-nav__ind" ref={ind} aria-hidden="true"><i /></span>
          </div>
        </nav>
        <div className="lv-nav__tools">
          <LangSwitch />
          <ThemeButton />
          <span className="lv-nav__wide">
            <Btn href={pathOf(lang, 'members')} kind="ghost" small>{L.members}</Btn>
          </span>
          <Btn href={page === 'home' ? '#baixar' : pathOf(lang, 'download')} small icon="chevdown">{L.download}</Btn>
          <details className="lv-menu">
            <summary className="lv-icon-btn" aria-label={L.menu}>
              <Icon name="menu" className="icon when-closed" />
              <Icon name="close" className="icon when-open" />
            </summary>
            <div className="lv-menu__panel" onClick={closeMenu}>
              <ul>
                {L.items.map((n, i) => (
                  <li key={n.id} style={idx(i)}>
                    <a href={`${base}#${n.id}`}>{n.label}</a>
                  </li>
                ))}
                <li style={idx(L.items.length)}>
                  <a href={pathOf(lang, 'members')}>{L.members}</a>
                </li>
              </ul>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ hero */

function Hero() {
  const { t } = useSite();
  const L = t.landing.hero;
  const words = L.title.split(' ');
  return (
    <section className="lv-hero" id="top" aria-labelledby="lv-title">
      <svg className="lv-hero__lines" viewBox="0 0 1440 1260" preserveAspectRatio="xMidYMin slice" aria-hidden="true">
        {(
          [
            [-200, 'accent', 0.06],
            [-80, 'teal', 0.05],
            [1100, 'accent', 0.05],
            [1220, 'teal', 0.04],
          ] as const
        ).map(([x, c, o], i) => (
          <path key={i} className="lv-hero__line" style={idx(i, { fill: tone(c), opacity: o })} transform={`translate(${x} 0)`} d="M420 0 L520 0 L100 1260 L0 1260 Z" />
        ))}
      </svg>
      <div className="lv-wrap lv-hero__inner">
        <div className="lv-hero__logo lv-h" style={idx(0)}>
          <img className="only-dark" src="/img/brand/badge.webp" width={640} height={654} alt={L.logoAlt} fetchPriority="high" />
          <img className="only-light" src="/img/brand/badge-light.webp" width={640} height={658} alt={L.logoAlt} loading="lazy" />
        </div>
        <p className="lv-version lv-h" style={idx(3)}>
          <span className="lv-version__dot" aria-hidden="true" />
          {L.version}
        </p>
        <h1 className="lv-hero__title" id="lv-title">
          {words.map((w, i) => (
            <span key={i}>
              <span className="lv-word lv-h" style={idx(5 + i)}>{w}</span>
              {i < words.length - 1 ? ' ' : ''}
            </span>
          ))}
        </h1>
        <p className="lv-hero__lead lv-h" style={idx(6 + words.length)}>{L.lead}</p>
        <div className="lv-hero__cta">
          <span className="lv-h" style={idx(8 + words.length)}><Btn href="#baixar" icon="chevdown">{L.download}</Btn></span>
          <span className="lv-h" style={idx(9 + words.length)}><Btn href="#tour" kind="ghost"><span className="lv-tri" aria-hidden="true" />{L.tour}</Btn></span>
          <span className="lv-h" style={idx(10 + words.length)}><Btn href={LINKS.repo} kind="ghost"><Icon name="github" className="icon lv-btn__lead" />{L.github}</Btn></span>
        </div>
        <div className="lv-hero__video lv-h lv-h--rise" style={idx(12 + words.length)}>
          <Tour />
        </div>
      </div>
    </section>
  );
}

function Facts() {
  const { t } = useSite();
  return (
    <section className="lv-facts" aria-label={t.a11y.summary} data-reveal>
      <ul className="lv-wrap lv-facts__grid">
        {t.landing.facts.map((f, i) => (
          <li key={f.value} className="lv-fact lv-r" style={idx(i, { ['--tone' as string]: tone(f.tone) })}>
            <span className="lv-fact__bar" aria-hidden="true" />
            <strong>{f.value}</strong>
            <span>{f.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ features */

function Checks({ items }: { items: string[] }) {
  return (
    <ul className="lv-checks">
      {items.map((b, i) => (
        <li key={b} className="lv-r" style={idx(4 + i)}>
          <span className="lv-checks__icon" aria-hidden="true"><Icon name="check" className="icon" /></span>
          {b}
        </li>
      ))}
    </ul>
  );
}

function Features() {
  const { t } = useSite();
  const L = t.landing.features;
  return (
    <section className="lv-panel lv-panel--base" id="recursos" aria-labelledby="lv-features">
      <div className="lv-wrap">
        <header className="lv-head lv-head--center" data-reveal>
          <Label>{L.eyebrow}</Label>
          <h2 className="lv-h2 lv-r" style={idx(1)} id="lv-features">{L.title}</h2>
          <p className="lv-sub lv-r" style={idx(2)}>{L.lead}</p>
        </header>
        <div className="lv-features">
          {L.items.map((f, i) => (
            <article key={f.id} className={`lv-feature${i % 2 ? ' lv-feature--flip' : ''}`} id={`recurso-${f.id}`} data-reveal style={{ ['--tone' as string]: tone(f.tone) }}>
              <div className={`lv-feature__media lv-r ${i % 2 ? 'lv-r--right' : 'lv-r--left'}`}>
                <Clip id={f.id as 'agentes'} shot={f.shot} alt={f.alt} tone={f.tone} />
              </div>
              <div className="lv-feature__text">
                <p className="lv-label lv-label--tone lv-r" style={idx(1)}>
                  0{i + 1} <span aria-hidden="true">·</span> {f.label}
                </p>
                <h3 className="lv-h3 lv-r" style={idx(2)}>{f.title}</h3>
                <p className="lv-body lv-r" style={idx(3)}>{f.text}</p>
                <Checks items={f.bullets} />
                <a className="lv-more lv-r" style={idx(8)} href="#tour">
                  {L.watch} <Icon name="chev" className="icon lv-more__arrow" />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Apps() {
  const { t } = useSite();
  const L = t.landing.apps;
  return (
    <section className="lv-panel lv-panel--bg" id="apps" aria-labelledby="lv-apps">
      <div className="lv-wrap">
        <header className="lv-head lv-head--split" data-reveal>
          <div>
            <Label tone="gold">{L.eyebrow}</Label>
            <h2 className="lv-h2 lv-r" style={idx(1)} id="lv-apps">{L.title}</h2>
          </div>
          <p className="lv-sub lv-r" style={idx(2)}>{L.lead}</p>
        </header>
        <ul className="lv-apps" data-reveal>
          {L.items.map((a, i) => (
            <li key={a.icon} className="lv-card lv-app lv-r" style={idx(i)}>
              <img className="lv-app__icon" src={`/img/apps/${a.icon}.webp`} width={72} height={72} alt="" loading="lazy" decoding="async" />
              <h3>{a.name}</h3>
              <p>{a.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ design system */

const DS_TONES = ['var(--accent)', 'var(--teal)', 'var(--gold)', 'var(--blue)'];

function DesignSystem() {
  const { t } = useSite();
  const L = t.landing.designSystem;
  return (
    <section className="lv-panel lv-panel--bg" id="design" aria-labelledby="lv-design">
      <div className="lv-wrap">
        <header className="lv-head lv-head--split" data-reveal>
          <div>
            <Label tone="gold">{L.eyebrow}</Label>
            <h2 className="lv-h2 lv-r" style={idx(1)} id="lv-design">
              {L.title}
            </h2>
          </div>
          <p className="lv-sub lv-r" style={idx(2)}>
            {L.lead}
          </p>
        </header>
        <ul className="lv-ds-grid" data-reveal>
          {L.items.map((g, i) => (
            <li key={g.shot} className="lv-r" style={idx(i)}>
              <a className="lv-card lv-ds-card" href={L.cta.href} {...external(L.cta.href)} style={{ ['--tone' as string]: DS_TONES[i % DS_TONES.length] }}>
                <span className="lv-ds-card__media">
                  <ShotImages shot={g.shot} alt={g.alt} sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 25vw" />
                </span>
                <span className="lv-ds-card__body">
                  <span className="lv-ds-card__n">{String(i + 1).padStart(2, '0')} · {L.page}</span>
                  <span className="lv-ds-card__title">{g.caption}</span>
                  <span className="lv-more lv-ds-card__more">
                    {L.open} <span className="lv-more__arrow" aria-hidden="true">→</span>
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="lv-design-cta lv-r" style={idx(4)} data-reveal>
          <Btn href={L.cta.href} kind="ghost">
            {L.cta.label}
          </Btn>
          <p>{L.cta.text}</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ gallery */

function Gallery() {
  const { t } = useSite();
  const L = t.landing.gallery;
  const [cur, setCur] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  const ind = useRef<HTMLSpanElement>(null);
  useIndicator(row, ind, cur);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = L.tabs.length;
    const next = e.key === 'ArrowRight' ? (cur + 1) % n : e.key === 'ArrowLeft' ? (cur - 1 + n) % n : e.key === 'Home' ? 0 : e.key === 'End' ? n - 1 : -1;
    if (next < 0) return;
    e.preventDefault();
    setCur(next);
    row.current?.querySelectorAll<HTMLElement>('[role="tab"]')[next]?.focus();
  };

  return (
    <section className="lv-panel lv-panel--base" id="capturas" aria-labelledby="lv-gallery">
      <div className="lv-wrap">
        <header className="lv-head lv-head--center" data-reveal>
          <Label tone="blue">{L.eyebrow}</Label>
          <h2 className="lv-h2 lv-r" style={idx(1)} id="lv-gallery">{L.title}</h2>
        </header>
        <div className="lv-gallery" data-reveal>
          <div className="lv-tabs-scroll lv-r">
            <div className="lv-tabs" role="tablist" aria-label={L.label} ref={row} onKeyDown={onKey}>
              <span className="lv-ind lv-tabs__ind" ref={ind} aria-hidden="true"><i /><i /><i /></span>
              {L.tabs.map((tab, i) => (
                <button
                  key={tab.shot}
                  type="button"
                  role="tab"
                  id={`lv-tab-${tab.shot}`}
                  aria-selected={i === cur}
                  aria-controls="lv-gallery-panel"
                  tabIndex={i === cur ? 0 : -1}
                  data-ind-item=""
                  onClick={() => setCur(i)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="lv-gallery__panel lv-r" style={idx(1)} role="tabpanel" id="lv-gallery-panel" aria-labelledby={`lv-tab-${L.tabs[cur].shot}`}>
            <div className="lv-gallery__stage">
              {L.tabs.map((tab, i) => (
                <div key={tab.shot} className="lv-gallery__shot" data-state={i === cur ? 'on' : i < cur ? 'before' : 'after'} aria-hidden={i === cur ? undefined : true}>
                  <ShotImages shot={tab.shot} alt={i === cur ? tab.alt : ''} sizes="(max-width: 1100px) 100vw, 1040px" />
                </div>
              ))}
            </div>
            <p className="lv-gallery__caption" key={cur} aria-live="polite">
              {L.tabs[cur].caption} <span className="lv-muted">{L.note}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ download */

function CodeBlock({ code }: { code: string }) {
  const { t } = useSite();
  const mounted = useMounted();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      ?.writeText(code.replace(/\\\n\s*/g, ''))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      })
      .catch(() => {});
  };
  return (
    <div className="lv-code">
      <pre><code>{code}</code></pre>
      {mounted && (
        <button type="button" className={`lv-code__copy${copied ? ' is-done' : ''}`} onClick={copy}>
          <Icon name={copied ? 'check' : 'doc'} className="icon icon--xs" />
          <span>{copied ? t.landing.download.copied : t.landing.download.copy}</span>
        </button>
      )}
    </div>
  );
}

function Download() {
  const { t, lang } = useSite();
  const L = t.landing.download;
  const E = L.edition;
  return (
    <section className="lv-panel lv-panel--bg" id="baixar" aria-labelledby="lv-download">
      <div className="lv-wrap">
        <header className="lv-head" data-reveal>
          <Label tone="gold">{L.eyebrow}</Label>
          <h2 className="lv-h2 lv-r" style={idx(1)} id="lv-download">{L.title}</h2>
          <p className="lv-body lv-head__lead lv-r" style={idx(2)}>{L.lead}</p>
        </header>
        <div className="lv-dl" data-reveal>
          <article className="lv-card lv-edition lv-r" style={idx(0, { ['--tone' as string]: 'var(--teal)' })}>
            <p className="lv-label lv-label--tone">{E.label}</p>
            <h3 className="lv-card__title">{E.title}</h3>
            <p className="lv-body">{E.text}</p>
            <div className="lv-edition__cta">
              <Btn href={LINKS.release} icon="chevdown">{E.iso}</Btn>
              <Btn href={LINKS.release} kind="ghost">{E.sums}</Btn>
              <Btn href={LINKS.releases} kind="ghost">{E.all}</Btn>
            </div>
            <ul className="lv-files" aria-label={E.filesLabel}>
              {E.files.map((f, i) => (
                <li key={f.name} className="lv-r" style={idx(3 + i, { ['--tone' as string]: tone(f.tone) })}>
                  <code>{f.name}</code>
                  <span>{f.badge}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="lv-card lv-req lv-r" style={idx(1, { ['--tone' as string]: 'var(--gold)' })}>
            <p className="lv-label lv-label--tone">{L.req.label}</p>
            <dl>
              {L.req.items.map((r) => (
                <div key={r.title}>
                  <dt>{r.title}</dt>
                  <dd>{r.text}</dd>
                </div>
              ))}
            </dl>
          </article>
        </div>
        <div data-reveal>
          <h3 className="lv-label lv-label--accent lv-steps__title lv-r">{L.startTitle}</h3>
          <ol className="lv-steps">
            {L.steps.map((s, i) => (
              <li key={s.title} className="lv-card lv-step lv-r" style={idx(1 + i)}>
                <p className="lv-step__head">
                  <span className="lv-step__n" aria-hidden="true">{i + 1}</span>
                  {s.title}
                </p>
                <CodeBlock code={s.code} />
              </li>
            ))}
          </ol>
          <p className="lv-warn lv-r" style={idx(5)}>
            <Icon name="alert" className="icon icon--sm" />
            <span>{L.warn}</span>
            <a href={pathOf(lang, 'download')}>
              {L.guide} <Icon name="chev" className="icon icon--xs" />
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ notes + roadmap */

function Notes() {
  const { t, lang } = useSite();
  const N = t.landing.notes;
  const R = t.landing.roadmap;
  return (
    <section className="lv-panel lv-panel--base" id="notas" aria-labelledby="lv-notes">
      <div className="lv-wrap lv-notes">
        <div data-reveal>
          <Label tone="coral">{N.eyebrow}</Label>
          <h2 className="lv-h2 lv-r" style={idx(1)} id="lv-notes">{N.title}</h2>
          <ul className="lv-plus">
            {N.items.map((x, i) => (
              <li key={x} className="lv-r" style={idx(2 + i)}>
                <span aria-hidden="true">+</span>
                {x}
              </li>
            ))}
          </ul>
          <p className="lv-muted lv-notes__limits lv-r" style={idx(7)}>{N.limits}</p>
          <a className="lv-more lv-r" style={idx(8, { ['--tone' as string]: 'var(--coral)' })} href={pathOf(lang, 'notes')}>
            {N.more} <Icon name="chev" className="icon lv-more__arrow" />
          </a>
        </div>
        <div id="roteiro" data-reveal>
          <Label tone="gold">{R.eyebrow}</Label>
          <div className="lv-road">
          <span className="lv-road__line lv-r" aria-hidden="true" />
          <ol>
            {R.items.map((m, i) => (
              <li key={m.title} className="lv-r" style={idx(1 + i * 2, { ['--tone' as string]: m.done ? 'var(--teal)' : 'var(--gold)' })}>
                <span className="lv-road__dot" aria-hidden="true" />
                <p className="lv-label lv-label--tone">{m.v}</p>
                <p className="lv-road__title">{m.title}</p>
                <p className="lv-road__status">{m.status}</p>
              </li>
            ))}
          </ol>
          </div>
          <a className="lv-more lv-r" style={idx(10, { ['--tone' as string]: 'var(--gold)' })} href={LINKS.roadmap} rel="noopener">
            {R.more} <Icon name="chev" className="icon lv-more__arrow" />
          </a>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ community */

function Community() {
  const { t } = useSite();
  const L = t.landing.community;
  return (
    <section className="lv-panel lv-panel--bg" id="comunidade" aria-labelledby="lv-community">
      <div className="lv-wrap">
        <header className="lv-head lv-head--center" data-reveal>
          <Label tone="purple">{L.eyebrow}</Label>
          <h2 className="lv-h2 lv-r" style={idx(1)} id="lv-community">{L.title}</h2>
          <p className="lv-sub lv-r" style={idx(2)}>{L.lead}</p>
        </header>
        <ul className="lv-channels" data-reveal>
          {L.cards.map((c, i) => (
            <li key={c.id} className="lv-r" style={idx(i, { ['--tone' as string]: tone(c.tone) })}>
              <MaybeLink href={c.href} className="lv-card lv-channel">
                <span className="lv-channel__icon" aria-hidden="true">
                  {c.id === 'github' ? <Icon name="github" className="icon" /> : c.name[0]}
                </span>
                <span className="lv-channel__name">{c.name}</span>
                <span className="lv-channel__text">{c.text}</span>
                <span className="lv-channel__cta">
                  {c.cta} {c.href && <Icon name="chev" className="icon icon--xs lv-more__arrow" />}
                </span>
              </MaybeLink>
            </li>
          ))}
        </ul>
        <div className="lv-videos" data-reveal>
          <Label tone="coral" dot={false}>{L.channel.eyebrow}</Label>
          <h3 className="lv-h4 lv-r" style={idx(1)}>{L.channel.title}</h3>
          <ul>
            {L.channel.videos.map((v, i) => {
              const inner = (
                <>
                  <span className="lv-video__img">
                    <ShotImages shot={v.shot} alt={v.alt} sizes="(max-width: 900px) 100vw, 414px" />
                  </span>
                  <span className="lv-video__shade" aria-hidden="true" />
                  <span className="lv-play lv-play--sm" aria-hidden="true"><span className="lv-play__tri" /></span>
                  <span className="lv-video__title">{v.title}</span>
                  <span className="lv-video__dur">{v.duration}</span>
                </>
              );
              return (
                <li key={v.id} className="lv-r" style={idx(2 + i)}>
                  {v.id === 'tour' ? <a className="lv-card lv-video" href="#tour">{inner}</a> : <div className="lv-card lv-video is-soon">{inner}</div>}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ support + members */

function Support() {
  const { t, lang } = useSite();
  const S = t.landing.support;
  const M = t.landing.members;
  return (
    <section className="lv-panel lv-panel--base lv-panel--last" id="apoie" aria-label={S.eyebrow} data-reveal>
      <div className="lv-wrap lv-support">
        <article className="lv-card lv-support__card lv-r" style={{ ['--tone' as string]: 'var(--coral)' }}>
          <p className="lv-label lv-label--tone"><span className="lv-label__dot" aria-hidden="true" />{S.eyebrow}</p>
          <h2 className="lv-card__title lv-card__title--lg">{S.title}</h2>
          <p className="lv-body">{S.text}</p>
          <ul className="lv-methods">
            {S.methods.map((m, i) => (
              <li key={m.name} className="lv-r" style={idx(2 + i, { ['--tone' as string]: tone(m.tone) })}>
                <strong>{m.name}</strong>
                <span>{m.text}</span>
              </li>
            ))}
          </ul>
          <div className="lv-support__cta">
            <span className="lv-btn lv-btn--accent is-soon" aria-disabled="true">
              <span className="lv-btn__label">{S.cta} <span aria-hidden="true">♥</span></span>
            </span>
            <p className="lv-muted">{S.soon}</p>
          </div>
        </article>
        <article className="lv-card lv-card--raised lv-members lv-r" style={idx(1, { ['--tone' as string]: 'var(--accent-text)' })} id="membros">
          <p className="lv-label lv-label--tone"><span className="lv-label__dot" aria-hidden="true" />{M.eyebrow}</p>
          <h2 className="lv-card__title lv-card__title--lg">{M.title}</h2>
          <p className="lv-body">{M.text}</p>
          <ul className="lv-members__list">
            {M.items.map((x) => (
              <li key={x}><Icon name="check" className="icon icon--sm" />{x}</li>
            ))}
          </ul>
          <Btn href={pathOf(lang, 'members')} kind="ghost" icon="chev">{M.cta}</Btn>
        </article>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ footer */

function Footer() {
  const { t, lang } = useSite();
  const F = t.landing.footer;
  return (
    <footer className="lv-footer">
      <div className="lv-wrap">
        <div className="lv-footer__top">
          <div className="lv-footer__brand">
            <a className="lv-brand" href={`${pathOf(lang, 'home')}#top`} aria-label="KalangoOS">
              <Symbol size={56} />
              <Wordmark />
            </a>
            <p>{F.tagline}</p>
            <a className="lv-follow" href={LINKS.releases} rel="noopener">
              <Icon name="bell" className="icon icon--sm" />
              <span>{F.follow}</span>
              <Icon name="chev" className="icon icon--xs" />
            </a>
          </div>
          {F.cols.map((c) => (
            <nav key={c.title} className="lv-footer__col" aria-label={c.title}>
              <p className="lv-label lv-label--muted">{c.title}</p>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}>
                    <MaybeLink href={l.href}>{l.label}</MaybeLink>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
        <div className="lv-footer__legal">
          <p>{t.footer.license}</p>
        </div>
        <div className="lv-footer__bottom">
          <p>{F.copyright}</p>
          <div className="lv-footer__prefs">
            <LangSwitch />
            <span className="lv-footer__theme">
              {F.theme}: <span className="when-dark">{F.dark}</span><span className="when-light">{F.light}</span>
            </span>
            <ThemeButton />
          </div>
        </div>
      </div>
    </footer>
  );
}

/** The skip link, the announcement and the menu: the top of every public page. */
export function SiteHeader() {
  const { t, lang } = useSite();
  return (
    <>
      <a className="skip" href="#main">{t.a11y.skip}</a>
      <a className="lv-announce" href={pathOf(lang, 'notes')}>
        <span>{t.landing.announce.text}</span>
        <span aria-hidden="true">·</span>
        <span className="lv-announce__link">
          {t.landing.announce.link} <Icon name="chev" className="icon icon--xs" />
        </span>
      </a>
      <Nav />
    </>
  );
}

export { Footer as SiteFooter };

/** The home page ("Landing v3 · Produto" in the Design System), in pt-BR and English, dark and light. */
export function Landing() {
  useLandingReveal();
  return (
    <div className="lv">
      <SiteHeader />
      <main id="main">
        <Hero />
        <Facts />
        <Features />
        <Apps />
        <DesignSystem />
        <Gallery />
        <Download />
        <Notes />
        <Community />
        <Support />
      </main>
      <Footer />
    </div>
  );
}
