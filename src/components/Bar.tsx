import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useSite } from '../lib/context';
import { MemberButton, useMemberState, type MemberState } from './Member';
import { pathOf, type PageId } from '../lib/routes';

const KEY = 'kalangoos-theme';

function currentTheme(): 'dark' | 'light' {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/**
 * The site's header is the system's top bar: brand, the island with the project's status, follow, language, theme and
 * the members area ("Entrar" or the account). `onLanding` is false on /membros/, where section links go back home.
 */
export function Bar({ onLanding = true, member }: { onLanding?: boolean; member?: MemberState }) {
  const { t, lang, page } = useSite();
  const memberState = useMemberState(member);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  useEffect(() => setTheme(currentTheme()), []);

  const toggle = () => {
    const next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* private mode: the choice lasts until the page closes */
    }
    setTheme(next);
  };

  const langPage: PageId = onLanding ? (page === 'notfound' ? 'home' : page) : 'home';

  // the other language opens the same page, and keeps the section in view on the landing home
  const keepHash = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onLanding && page === 'home' && location.hash) e.currentTarget.href = e.currentTarget.pathname + location.hash;
  };
  const home = pathOf(lang, 'home');

  return (
    <header className="bar">
      <a className="bar__brand" href={`${home}#top`}>
        <img src="/img/brand/symbol.webp" width="36" height="40" alt="" />
        <span>KalangoOS</span>
      </a>
      <a className="island" href={pathOf(lang, 'download')}>
        <span className="dot" aria-hidden="true" />
        <strong>{t.bar.status}</strong>
        <span className="sep" aria-hidden="true">·</span>
        <span className="muted detail">{t.bar.statusDetail}</span>
        <span className="island__more">
          {t.bar.statusLink}
          <Icon name="chev" className="icon icon--xs" />
        </span>
      </a>
      <div className="bar__right">
        <a className="indicator" href={pathOf(lang, 'download')} aria-current={page === 'download' ? 'page' : undefined}>
          <Icon name="chevdown" />
          {t.bar.download}
          <span className="indicator__dots" aria-hidden="true"><i /><i /><i /></span>
        </a>
        <nav className="lang" aria-label={t.a11y.language}>
          <a href={pathOf('pt-BR', langPage)} hrefLang="pt-BR" lang="pt-BR" aria-current={lang === 'pt-BR' ? 'true' : undefined} onClick={keepHash}>
            <span aria-hidden="true">PT</span>
            <span className="visually-hidden">Português</span>
          </a>
          <a href={pathOf('en', langPage)} hrefLang="en" lang="en" aria-current={lang === 'en' ? 'true' : undefined} onClick={keepHash}>
            <span aria-hidden="true">EN</span>
            <span className="visually-hidden">English</span>
          </a>
        </nav>
        <button
          type="button"
          className="theme-btn"
          onClick={toggle}
          aria-label={theme === 'dark' ? t.a11y.themeToLight : t.a11y.themeToDark}
          title={theme === 'dark' ? t.a11y.themeToLight : t.a11y.themeToDark}
        >
          <Icon name="sun" className="icon when-dark" />
          <Icon name="moon" className="icon when-light" />
        </button>
        <span className="bar__sep" aria-hidden="true" />
        <MemberButton state={memberState} />
      </div>
    </header>
  );
}
