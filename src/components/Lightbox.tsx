import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Icon } from './Icon';
import { useSite } from '../lib/context';
import { allShots, SHOTS } from '../content';

export type LightboxHandle = { open: (shot: string) => void };

/** Enlarged capture in a modal dialog: Esc closes, ←/→ step through the page's captures. */
export const Lightbox = forwardRef<LightboxHandle>(function Lightbox(_, ref) {
  const { t } = useSite();
  const list = allShots(t);
  const dlg = useRef<HTMLDialogElement>(null);
  const [i, setI] = useState(0);
  useImperativeHandle(ref, () => ({
    open(shot: string) {
      const k = list.findIndex((s) => s.shot === shot);
      setI(k < 0 ? 0 : k);
      dlg.current?.showModal();
    },
  }));
  const cur = list[i];
  const s = SHOTS[cur.shot];
  const step = (d: number) => setI((x) => (x + d + list.length) % list.length);
  return (
    <dialog
      ref={dlg}
      className="lightbox"
      aria-label={cur.caption}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1);
        if (e.key === 'ArrowLeft') step(-1);
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).classList.contains('lightbox__inner')) dlg.current?.close();
      }}
    >
      <div className="lightbox__inner">
        <div className="lightbox__tools">
          <button type="button" className="icon-btn" onClick={() => step(-1)} aria-label={t.a11y.previous}>
            <Icon name="chev" className="icon" />
          </button>
          <button type="button" className="icon-btn" onClick={() => step(1)} aria-label={t.a11y.next}>
            <Icon name="chev" className="icon" />
          </button>
          <button type="button" className="icon-btn" onClick={() => dlg.current?.close()} aria-label={t.a11y.close} autoFocus>
            <Icon name="close" className="icon" />
          </button>
        </div>
        <figure key={cur.shot}>
          <img src={`/img/shots/${cur.shot}.webp`} width={s.w} height={s.h} alt={cur.alt} />
          <figcaption>{cur.caption}</figcaption>
        </figure>
      </div>
    </dialog>
  );
});
