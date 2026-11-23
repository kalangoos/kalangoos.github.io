import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { SHOTS } from '../content';

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow">
      <Icon name="spark" className="icon icon--sm" />
      {children}
    </p>
  );
}

/** One capture as <img> elements: the dark one, and the light one when the screen was also captured in the light
 *  theme. CSS shows the one for the page's theme (data-theme or prefers-color-scheme, so also without JavaScript);
 *  the hidden one is lazy and display:none, so the browser does not download it. */
export function ShotImages({ shot, alt, eager, sizes }: { shot: string; alt: string; eager?: boolean; sizes?: string }) {
  const s = SHOTS[shot];
  const one = (variant: '' | '-light') => {
    const src = `/img/shots/${shot}${variant}.webp`;
    return (
      <img
        key={variant || 'dark'}
        className={s.light ? (variant ? 'only-light' : 'only-dark') : undefined}
        src={src}
        srcSet={s.small ? `/img/shots/${shot}${variant}-640.webp 640w, ${src} ${s.w}w` : undefined}
        sizes={s.small ? sizes ?? '(max-width: 760px) 100vw, 50vw' : undefined}
        width={s.w}
        height={s.h}
        alt={alt}
        loading={eager && !s.light ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  };
  return s.light ? <>{one('')}{one('-light')}</> : one('');
}

export function Checks({ items, icon = 'check', tone = 'teal', small }: { items: string[]; icon?: string; tone?: 'teal' | 'coral' | 'gold'; small?: boolean }) {
  return (
    <ul className={`checks checks--${tone}${small ? ' checks--sm' : ''}`}>
      {items.map((x) => (
        <li key={x}>
          <Icon name={icon} />
          <span>{x}</span>
        </li>
      ))}
    </ul>
  );
}
