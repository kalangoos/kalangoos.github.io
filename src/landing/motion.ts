import { useEffect, useState, type CSSProperties, type RefObject } from 'react';

/** A colour token for a tone name; "accent" uses accent-text, which keeps contrast in the light theme. */
export const tone = (x: string) => (x === 'accent' ? 'var(--accent-text)' : `var(--${x})`);

/** `style` with the stagger index of a revealed child (CSS turns it into a delay with the cascade token). */
export const idx = (i: number, extra?: CSSProperties): CSSProperties => ({ ['--i' as string]: i, ...extra });

export function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** True after hydration: for controls that only work with JavaScript (they are not in the pre-rendered HTML). */
export function useMounted(): boolean {
  const [m, setM] = useState(false);
  useEffect(() => setM(true), []);
  return m;
}

/**
 * Scroll reveal for the landing: every [data-reveal] gets .is-in once it enters the viewport, and its .lv-r children
 * run their spring transitions, staggered by --i. The hero gets .is-in right after hydration (its entrance
 * choreography). One IntersectionObserver, no scroll handlers. Without JavaScript nothing is hidden: the CSS only
 * hides under html.js.
 */
export function useLandingReveal() {
  useEffect(() => {
    const hero = document.querySelector('.lv-hero');
    requestAnimationFrame(() => hero?.classList.add('is-in'));
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/** The nav's scrolled state (blur + condense), from one rAF-throttled passive scroll listener. */
export function useNavScrolled(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    let raf = 0;
    let last: boolean | null = null;
    const update = () => {
      raf = 0;
      const on = window.scrollY > 24;
      if (on !== last) {
        last = on;
        ref.current?.toggleAttribute('data-scrolled', on);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
}

/**
 * Moves a sliding indicator under the active item of a row (tabs, nav links): transform only, so it glides on the
 * spring set in CSS. Follows resizes and late font loads.
 */
export function useIndicator(row: RefObject<HTMLElement | null>, ind: RefObject<HTMLElement | null>, active: number) {
  useEffect(() => {
    const r = row.current;
    const i = ind.current;
    if (!r || !i) return;
    const place = () => {
      const items = r.querySelectorAll<HTMLElement>('[data-ind-item]');
      const a = items[active];
      if (!a) {
        i.style.opacity = '0';
        return;
      }
      i.style.opacity = '1';
      // the CSS turns --x/--w into transforms of the indicator's parts (caps + stretched middle), so rounded ends
      // stay round while it glides
      i.style.setProperty('--x', String(a.offsetLeft));
      i.style.setProperty('--w', String(a.offsetWidth));
      r.setAttribute('data-ind', '');
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(r);
    document.fonts?.ready.then(place).catch(() => {});
    return () => ro.disconnect();
  }, [row, ind, active]);
}

const THEME_KEY = 'kalangoos-theme';

export function currentTheme(): 'dark' | 'light' {
  const set = document.documentElement.getAttribute('data-theme');
  if (set === 'light' || set === 'dark') return set;
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

/** Switches the theme with a cross-fade of the whole page (View Transitions when the browser has them). */
export function switchTheme(): 'dark' | 'light' {
  const next = currentTheme() === 'dark' ? 'light' : 'dark';
  const apply = () => {
    document.documentElement.setAttribute('data-theme', next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {
      /* private mode: the choice lasts until the page closes */
    }
  };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (doc.startViewTransition && !reducedMotion()) doc.startViewTransition(apply);
  else apply();
  return next;
}
