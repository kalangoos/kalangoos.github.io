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

/** A real capture from the test session; clicking opens it enlarged. */
export function Shot({ shot, alt, eager, sizes, fit }: { shot: string; alt: string; eager?: boolean; sizes?: string; fit?: boolean }) {
  const { t, openShot } = useSite();
  const s = SHOTS[shot];
  const src = `/img/shots/${shot}.webp`;
  return (
    <button
      type="button"
      className={`capture__img${fit ? ' capture__img--fit' : ''}`}
      onClick={() => openShot(shot)}
      aria-label={`${t.a11y.openImage}: ${alt}`}
      style={{ aspectRatio: fit ? '1280 / 800' : `${s.w} / ${s.h}` }}
    >
      <img
        src={src}
        srcSet={s.small ? `/img/shots/${shot}-640.webp 640w, ${src} ${s.w}w` : undefined}
        sizes={s.small ? sizes ?? '(max-width: 720px) 100vw, 400px' : undefined}
        width={s.w}
        height={s.h}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : undefined}
      />
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
