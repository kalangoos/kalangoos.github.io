import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from '../components/Icon';
import { fetchTree } from './repo';
import type { Heading } from './Markdown';

/** The repository's file list, once per page (and kept 10 minutes in sessionStorage by fetchTree). */
let treePromise: Promise<string[]> | null = null;
export function useTree(): { paths: string[] | null; error: string | null } {
  const [paths, setPaths] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    treePromise ??= fetchTree();
    treePromise.then(setPaths, (e: Error) => {
      treePromise = null;
      setError(e.message === 'rate' ? 'O GitHub limitou as consultas sem login deste endereço por uma hora. Tente de novo mais tarde.' : 'Não foi possível ler o repositório no GitHub.');
    });
  }, []);
  return { paths, error };
}

/** "/" focuses the search field, as the design's key hint says. */
export function useSlashFocus(ref: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA') {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    addEventListener('keydown', k);
    return () => removeEventListener('keydown', k);
  }, [ref]);
}

export function SearchField({ value, onChange, placeholder, inputRef, kbd = true }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  kbd?: boolean;
}) {
  return (
    <label className="search">
      <Icon name="search" />
      <input ref={inputRef} type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} aria-label={placeholder} />
      {kbd && !value && <kbd aria-hidden="true">/</kbd>}
    </label>
  );
}

/** Side list on wide screens; on phones the same list opens from a "choose" button as a sheet from the bottom. */
export function SidePanel({ title, current, icon, children, search }: {
  title: string;
  current: string;
  icon: string;
  children: ReactNode;
  /** The search field; called twice (side list and phone sheet), only the side one takes the "/" shortcut's ref. */
  search: (inSheet: boolean) => ReactNode;
}) {
  const sheet = useRef<HTMLDialogElement>(null);
  // close the sheet when a link inside it is followed
  const onClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('a')) sheet.current?.close();
  };
  return (
    <>
      <aside className="side" aria-label={title}>
        <h2 className="side__title">{title}</h2>
        {search(false)}
        <div className="side__list">{children}</div>
      </aside>
      <div className="mpick">
        <button type="button" className="mpick__btn" onClick={() => sheet.current?.showModal()} aria-haspopup="dialog">
          <Icon name={icon} />
          <span>{current}</span>
          <Icon name="chevdown" />
        </button>
        <button
          type="button"
          className="mpick__search"
          aria-label="Buscar"
          onClick={() => {
            sheet.current?.showModal();
            sheet.current?.querySelector<HTMLInputElement>('input[type="search"]')?.focus();
          }}
        >
          <Icon name="search" />
        </button>
      </div>
      <dialog
        ref={sheet}
        className="msheet"
        aria-label={title}
        onClick={(e) => {
          if (e.target === e.currentTarget) sheet.current?.close();
        }}
      >
        <div className="msheet__panel" onClick={onClick}>
          <div className="msheet__head">
            <h2>{title}</h2>
            <button type="button" className="icon-btn" onClick={() => sheet.current?.close()} aria-label="Fechar">
              <Icon name="close" />
            </button>
          </div>
          {search(true)}
          <div className="side__list">{children}</div>
        </div>
      </dialog>
    </>
  );
}

export function SideItem({ href, label, icon, current, meta, progress }: {
  href: string;
  label: string;
  icon: string;
  current?: boolean;
  meta?: string;
  progress?: { done: number; total: number } | null;
}) {
  return (
    <a href={href} className={`side__item${progress ? ' has-progress' : ''}`} aria-current={current ? 'page' : undefined}>
      <Icon name={icon} />
      <span className="side__label">{label}</span>
      {meta && <span className="side__meta">{meta}</span>}
      {progress && (
        <>
          <span className="side__bar" aria-hidden="true">
            <i style={{ width: `${progress.total ? (100 * progress.done) / progress.total : 0}%` }} />
          </span>
          <span className="side__count">
            {progress.done}/{progress.total}
          </span>
        </>
      )}
    </a>
  );
}

/** The heading in view: the last one whose top is above 30% of the window. */
export function useScrollSpy(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null);
  useEffect(() => {
    if (!ids.length) return;
    let raf = 0;
    const pick = () => {
      raf = 0;
      let cur = ids[0]!;
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top < innerHeight * 0.3) cur = id;
      }
      setActive(cur);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(pick);
    };
    pick();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ids]);
  return active;
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  el.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  el.setAttribute('tabindex', '-1');
  el.focus({ preventScroll: true });
}

/** "Nesta página": a column on wide screens, a collapsed block on phones. */
export function Toc({ items, title = 'Nesta página' }: { items: Heading[]; title?: string }) {
  const ids = useMemo(() => items.map((i) => i.id), [items]);
  const active = useScrollSpy(ids);
  if (!items.length) return null;
  const list = (
    <ol className="toc__list">
      {items.map((h) => (
        <li key={h.id} className={`toc__item lvl-${h.depth}`} aria-current={active === h.id ? 'location' : undefined}>
          <a
            href={`#${h.id}`}
            onClick={(e) => {
              e.preventDefault();
              scrollToId(h.id);
            }}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <>
      <nav className="toc" aria-label={title}>
        <p className="toc__title">{title}</p>
        {list}
      </nav>
      <details className="toc-m">
        <summary>
          <Icon name="list" />
          {title}
          <Icon name="chevdown" />
        </summary>
        {list}
      </details>
    </>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'error' }) {
  return (
    <p className={`mnotice mnotice--${tone}`}>
      <Icon name={tone === 'error' ? 'alert' : 'info'} />
      <span>{children}</span>
    </p>
  );
}
