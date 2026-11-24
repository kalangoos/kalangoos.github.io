import { publishedLocales } from '../lib/locales';
import { pathOf, type PageId } from '../lib/routes';
import { useSite } from '../lib/context';

type Props = {
  /** CSS class on the <nav> (bar uses `lang`, landing uses `lv-lang`). */
  className?: string;
  /** Home keeps the section hash when switching language. */
  keepHashOnHome?: boolean;
};

/**
 * Language switcher for every published locale. Compact short codes in the bar; landing can pass `lv-lang`.
 */
export function LangSwitch({ className = 'lang', keepHashOnHome = false }: Props) {
  const { t, lang, page } = useSite();
  const target: PageId = page === 'notfound' ? 'home' : page;
  const keepHash = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!location.hash) return;
    if (keepHashOnHome && page !== 'home') return;
    e.currentTarget.href = e.currentTarget.pathname + location.hash;
  };

  return (
    <nav className={className} aria-label={t.a11y.language}>
      {publishedLocales().map((loc) => (
        <a
          key={loc.id}
          href={pathOf(loc.id, target)}
          hrefLang={loc.hreflang}
          lang={loc.id}
          title={loc.nativeName}
          aria-current={lang === loc.id ? 'true' : undefined}
          onClick={keepHash}
        >
          <span aria-hidden="true">{loc.short}</span>
          <span className="visually-hidden">{loc.nativeName}</span>
        </a>
      ))}
    </nav>
  );
}
