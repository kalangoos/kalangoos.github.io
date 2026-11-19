import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import { useSite } from '../lib/context';

const KEY = 'kalangoos-theme';

function currentTheme(): 'dark' | 'light' {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** The site's header is the system's top bar: brand, the island with the project's status, follow, language and theme. */
export function Bar() {
  const { t, lang } = useSite();
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

  // the other language keeps the section in view
  const keepHash = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (location.hash) e.currentTarget.href = e.currentTarget.pathname + location.hash;
  };
  const home = lang === 'en' ? '/en/' : '/';

  return (
    <header className="bar">
      <a className="bar__brand" href={`${home}#top`}>
        <img src="/img/brand/symbol.webp" width="22" height="24" alt="" />
        <span>KalangoOS</span>
      </a>
      <a className="island" href="#roadmap">
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
        <a className="indicator" href="#follow">
          <Icon name="spark" />
          {t.follow.eyebrow}
          <span className="indicator__dots" aria-hidden="true"><i /><i /><i /></span>
        </a>
        <nav className="lang" aria-label={t.a11y.language}>
          <a href="/" hrefLang="pt-BR" lang="pt-BR" aria-current={lang === 'pt-BR' ? 'true' : undefined} onClick={keepHash}>
            <span aria-hidden="true">PT</span>
            <span className="visually-hidden">Português</span>
          </a>
          <a href="/en/" hrefLang="en" lang="en" aria-current={lang === 'en' ? 'true' : undefined} onClick={keepHash}>
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
      </div>
    </header>
  );
}
