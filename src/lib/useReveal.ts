import { useEffect } from 'react';

/** Adds .is-in to every .reveal (and .agent-panel) once it scrolls into view: the spring fade-up from the
 *  Design System. Without JavaScript nothing is hidden (the CSS only hides under html.js). */
export function useReveal() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.reveal, .agent-panel'));
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
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/** The id of the section in view, for the dock's active item. */
export function useScrollSpy(ids: string[], set: (id: string) => void) {
  useEffect(() => {
    const sections = ids.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (!('IntersectionObserver' in window) || !sections.length) return;
    const visible = new Map<string, number>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0);
        let best = '';
        let top = Infinity;
        for (const s of sections) {
          if ((visible.get(s.id) ?? 0) > 0) {
            const y = Math.abs(s.getBoundingClientRect().top);
            if (y < top) { top = y; best = s.id; }
          }
        }
        if (best) set(best);
      },
      { rootMargin: '-35% 0px -55% 0px', threshold: [0, 0.01] },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [ids, set]);
}
