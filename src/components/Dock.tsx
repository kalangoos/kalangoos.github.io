import { useCallback, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useSite } from '../lib/context';
import { useScrollSpy } from '../lib/useReveal';

const MOBILE_KEEP = ['top', 'agents', 'undo', 'security', 'roadmap'];

/** The site's navigation is the system's single dock: one item per section, the grid opens every section. */
export function Dock() {
  const { t } = useSite();
  const [active, setActive] = useState('top');
  const sheet = useRef<HTMLDialogElement>(null);
  const ids = useMemo(() => [...t.nav.map((n) => n.id), ...t.navMore.map((n) => n.id)], [t]);
  const set = useCallback((id: string) => setActive(id), []);
  useScrollSpy(ids, set);

  const go = () => sheet.current?.close();

  return (
    <>
      <nav className="dock" aria-label={t.a11y.sections}>
        {t.nav.map((n) => (
          <a
            key={n.id}
            href={`#${n.id}`}
            className={`dock__item${MOBILE_KEEP.includes(n.id) ? '' : ' is-extra'}`}
            aria-current={active === n.id ? 'true' : undefined}
          >
            <span className="dock__tile">
              <Icon name={n.icon} />
            </span>
            <span className="dock__bar" aria-hidden="true" />
            <span className="dock__tip">{n.label}</span>
            <span className="visually-hidden">{n.label}</span>
          </a>
        ))}
        <span className="dock__sep" aria-hidden="true" />
        <button type="button" className="dock__item" onClick={() => sheet.current?.showModal()} aria-haspopup="dialog">
          <span className="dock__tile">
            <Icon name="grid" />
          </span>
          <span className="dock__bar" aria-hidden="true" />
          <span className="dock__tip">{t.a11y.allSections}</span>
          <span className="visually-hidden">{t.a11y.allSections}</span>
        </button>
      </nav>
      <dialog
        ref={sheet}
        className="sheet"
        aria-labelledby="sheet-title"
        onClick={(e) => {
          if (e.target === e.currentTarget) sheet.current?.close();
        }}
      >
        <div className="sheet__panel">
          <div className="sheet__head">
            <h2 id="sheet-title">{t.a11y.allSections}</h2>
            <button type="button" className="icon-btn" onClick={() => sheet.current?.close()} aria-label={t.a11y.close}>
              <Icon name="close" />
            </button>
          </div>
          <nav className="sheet__grid" aria-label={t.a11y.sections}>
            {[...t.nav, ...t.navMore].map((n) => (
              <a key={n.id} href={`#${n.id}`} onClick={go} aria-current={active === n.id ? 'true' : undefined}>
                <span className="dock__tile">
                  <Icon name={n.icon} />
                </span>
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </dialog>
    </>
  );
}
