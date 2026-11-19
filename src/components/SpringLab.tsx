import { useRef, useState } from 'react';
import { useSite } from '../lib/context';

/** Plays the Design System's springs (CSS linear() curves generated from the tokens). */
export function SpringLab() {
  const { t } = useSite();
  const M = t.desktop.motion;
  const box = useRef<HTMLDivElement>(null);
  const [reduced, setReduced] = useState(false);

  const play = () => {
    const el = box.current;
    if (!el) return;
    const lanes = el.querySelectorAll<HTMLElement>('.spring__lane');
    lanes.forEach((l) => l.style.setProperty('--to', `${l.clientWidth - 28}px`));
    const less = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setReduced(less);
    if (less) {
      // a fade instead of travel
      el.classList.toggle('is-playing');
      el.querySelectorAll<HTMLElement>('.spring__ball').forEach((b) =>
        b.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 90, easing: 'linear' }),
      );
      return;
    }
    if (el.classList.contains('is-playing')) {
      el.classList.remove('is-playing');
    } else {
      el.classList.add('is-playing');
    }
  };

  return (
    <div className="card springs reveal" ref={box}>
      <div className="springs__top">
        <div>
          <h3>{M.title}</h3>
          <p>{M.text}</p>
        </div>
        <button type="button" className="btn btn--secondary" onClick={play}>{M.play}</button>
      </div>
      <ul className="springs__list">
        {M.springs.map((s) => (
          <li className="spring" key={s.id}>
            <span>
              <b>{s.name}</b>
              <small title={M.units}>{s.k} / {s.c}</small>
            </span>
            <span className="spring__lane" aria-hidden="true">
              <span className="spring__ball" />
            </span>
          </li>
        ))}
      </ul>
      {reduced && <p className="springs__note" role="status">{M.reduced}</p>}
    </div>
  );
}
