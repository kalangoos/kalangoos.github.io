import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from './Icon';
import { localeOf, publishedLocales } from '../lib/locales';
import { pathOf, type PageId } from '../lib/routes';
import { useSite } from '../lib/context';

type Props = {
  /** Extra class on the root (bar: `lang`, landing: `lv-lang`). */
  className?: string;
  /** Home keeps the section hash when switching language. */
  keepHashOnHome?: boolean;
};

/**
 * Language dropdown: shows the current short code, lists every published locale by native name.
 */
export function LangSwitch({ className = '', keepHashOnHome = false }: Props) {
  const { t, lang, page } = useSite();
  const target: PageId = page === 'notfound' ? 'home' : page;
  const current = localeOf(lang) ?? publishedLocales()[0]!;
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const keepHash = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!location.hash) return;
    if (keepHashOnHome && page !== 'home') return;
    e.currentTarget.href = e.currentTarget.pathname + location.hash;
  };

  return (
    <div className={`lang-dd${className ? ` ${className}` : ''}`} ref={root}>
      <button
        type="button"
        className="lang-dd__btn"
        aria-label={t.a11y.language}
        aria-expanded={open}
        aria-controls={menuId}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="lang-dd__code" lang={current.id}>
          {current.short}
        </span>
        <Icon name="chevdown" className="icon icon--xs lang-dd__chev" />
      </button>
      {open ? (
        <ul id={menuId} className="lang-dd__menu" role="listbox" aria-label={t.a11y.language}>
          {publishedLocales().map((loc) => {
            const selected = lang === loc.id;
            return (
              <li key={loc.id} role="presentation">
                <a
                  role="option"
                  href={pathOf(loc.id, target)}
                  hrefLang={loc.hreflang}
                  lang={loc.id}
                  aria-selected={selected}
                  aria-current={selected ? 'true' : undefined}
                  onClick={keepHash}
                >
                  <span className="lang-dd__code" aria-hidden="true">
                    {loc.short}
                  </span>
                  <span className="lang-dd__name">{loc.nativeName}</span>
                </a>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
