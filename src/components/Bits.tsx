import type { ReactNode } from 'react';
import { Icon } from './Icon';
import { useSite } from '../lib/context';
import { SHOTS } from '../content';

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="eyebrow">
      <Icon name="spark" className="icon icon--sm" />
      {children}
    </p>
  );
}

export function SectionHead({ eyebrow, title, lead, extra }: { eyebrow: string; title: string; lead?: string; extra?: ReactNode }) {
  return (
    <header className="head reveal">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="display">{title}</h2>
      {lead && <p className="lead">{lead}</p>}
      {extra}
    </header>
  );
}

export function CaptureChip() {
  const { t } = useSite();
  return (
    <span className="capture-chip">
      <span className="dot" aria-hidden="true" />
      {t.a11y.realCapture}
    </span>
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

/** A real capture from the test session; clicking opens it enlarged. */
export function Shot({ shot, alt, eager, sizes, fit }: { shot: string; alt: string; eager?: boolean; sizes?: string; fit?: boolean }) {
  const { t, openShot } = useSite();
  const s = SHOTS[shot];
  return (
    <button
      type="button"
      className={`capture__img${fit ? ' capture__img--fit' : ''}`}
      onClick={() => openShot(shot)}
      aria-label={`${t.a11y.openImage}: ${alt}`}
      style={{ aspectRatio: fit ? '1280 / 800' : `${s.w} / ${s.h}`, maxWidth: fit ? undefined : s.w }} /* never drawn past its own width */
    >
      <ShotImages shot={shot} alt={alt} eager={eager} sizes={sizes} />
    </button>
  );
}

export function Capture({ shot, alt, caption, sizes, fit, className }: { shot: string; alt: string; caption: string; sizes?: string; fit?: boolean; className?: string }) {
  return (
    <figure className={`capture reveal ${className ?? ''}`}>
      <Shot shot={shot} alt={alt} sizes={sizes} fit={fit} />
      <figcaption>
        <CaptureChip />
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

export function WindowControls() {
  return (
    <span className="window__controls" aria-hidden="true">
      <span><Icon name="min" /></span>
      <span><Icon name="max" /></span>
      <span><Icon name="close" /></span>
    </span>
  );
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
