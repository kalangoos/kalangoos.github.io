import { useLayoutEffect, useRef, useState } from 'react';
import { Icon } from '../components/Icon';
import { CaptureChip, SectionHead, Shot, WindowControls } from '../components/Bits';
import { useSite } from '../lib/context';

const useIso = typeof window === 'undefined' ? () => {} : useLayoutEffect;

/** What agents do, in an Agent center window: the tabs follow the ARIA tablist pattern. */
export function Agents() {
  const { t } = useSite();
  const A = t.agents;
  const [sel, setSel] = useState(0);
  const row = useRef<HTMLDivElement>(null);
  const [ink, setInk] = useState<{ x: number; w: number } | null>(null);

  useIso(() => {
    const el = row.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[sel];
    if (el) setInk({ x: el.offsetLeft + 2, w: Math.min(24, el.offsetWidth - 4) });
  }, [sel]);

  const onKey = (e: React.KeyboardEvent) => {
    const n = A.tabs.length;
    let next = sel;
    if (e.key === 'ArrowRight') next = (sel + 1) % n;
    else if (e.key === 'ArrowLeft') next = (sel - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else return;
    e.preventDefault();
    setSel(next);
    const tabs = row.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    tabs?.[next]?.focus();
    tabs?.[next]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  return (
    <section className="section" id="agents" aria-labelledby="agents-title">
      <div className="container">
        <SectionHead eyebrow={A.eyebrow} title={A.title} lead={A.lead} />
        <div className="window window--app reveal">
          <div className="window__bar">
            <span className="window__app">
              <img src="/img/apps/agentes.webp" width="22" height="22" alt="" />
              {A.window}
            </span>
            <div className="tabs-row" role="tablist" aria-label={A.title} ref={row} onKeyDown={onKey}>
              {A.tabs.map((x, i) => (
                <button
                  key={x.id}
                  type="button"
                  role="tab"
                  id={`tab-${x.id}`}
                  aria-selected={sel === i}
                  aria-controls={`panel-${x.id}`}
                  tabIndex={sel === i ? 0 : -1}
                  className="tab"
                  onClick={() => setSel(i)}
                >
                  {x.label}
                </button>
              ))}
              {ink && <span className="tab-ink" aria-hidden="true" style={{ width: ink.w, transform: `translateX(${ink.x}px)` }} />}
            </div>
            <WindowControls />
          </div>
          {A.tabs.map((x, i) => (
            <div
              key={x.id}
              role="tabpanel"
              id={`panel-${x.id}`}
              aria-labelledby={`tab-${x.id}`}
              hidden={sel !== i}
              className="tabpanel showcase__body"
            >
              <div className="showcase__text">
                <h3 className="display">{x.title}</h3>
                <p>{x.text}</p>
              </div>
              <div className="showcase__shot">
                <Shot shot={x.shot} alt={x.alt} sizes="(max-width: 900px) 100vw, 780px" />
                <CaptureChip />
              </div>
            </div>
          ))}
        </div>
        <div className="more reveal">
          <h3>{A.moreTitle}</h3>
          <ul className="chips">
            {A.more.map((m) => (
              <li key={m} className="chip chip--spark">
                <Icon name="spark" />
                {m}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
