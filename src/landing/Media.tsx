import { useEffect, useRef, useState } from 'react';
import { ShotImages } from '../components/Bits';
import { useSite } from '../lib/context';
import { CLIPS, type ClipSource } from './media';
import { reducedMotion, tone as toneVar } from './motion';

/** The light-theme render when there is one, else the default. */
function pickSrc(c: NonNullable<ClipSource>): string {
  const light = document.documentElement.getAttribute('data-theme') === 'light' ||
    (!document.documentElement.hasAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: light)').matches);
  return light && c.light ? c.light : c.src;
}

/**
 * A short looping clip (rendered later with Remotion into public/video/). It plays only while at least half of it is
 * on screen and pauses otherwise; the progress bar follows the video. Until the clip exists (CLIPS[id] is null), the
 * poster capture shows with the "▶ CLIPE" badge, breathing slowly while in view. With reduced motion, the poster stays
 * still and nothing autoplays.
 */
export function Clip({ id, shot, alt, tone, portrait }: { id: keyof typeof CLIPS; shot: string; alt: string; tone: string; portrait?: boolean }) {
  const { t } = useSite();
  const fig = useRef<HTMLElement>(null);
  const vid = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLElement>(null);
  const clip = CLIPS[id];

  useEffect(() => {
    const el = fig.current;
    if (!el || !('IntersectionObserver' in window)) return;
    const v = vid.current;
    let raf = 0;
    const tick = () => {
      if (v && bar.current && v.duration) bar.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onPlaying = () => {
      el.classList.add('is-playing');
      if (!raf) raf = requestAnimationFrame(tick);
    };
    v?.addEventListener('playing', onPlaying);
    v?.addEventListener('pause', stop);
    const io = new IntersectionObserver(
      ([e]) => {
        const on = e.isIntersecting && e.intersectionRatio >= 0.5;
        el.classList.toggle('is-live', on);
        if (!v || reducedMotion()) return;
        if (on) {
          if (!v.src) v.src = pickSrc(clip!);
          v.play().catch(() => {});
        } else v.pause();
      },
      { threshold: [0, 0.5] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop();
      v?.removeEventListener('playing', onPlaying);
      v?.removeEventListener('pause', stop);
    };
  }, [clip]);

  return (
    <figure ref={fig} className={`lv-clip${portrait ? ' lv-clip--portrait' : ''}${clip ? '' : ' lv-clip--poster'}`} style={{ ['--tone' as string]: toneVar(tone) }}>
      <div className="lv-clip__frame">
        {portrait && (
          <div className="lv-clip__backdrop" aria-hidden="true">
            <img className="only-dark" src="/img/wallpaper/dark-1200.webp" alt="" width={1200} height={750} loading="lazy" decoding="async" />
            <img className="only-light" src="/img/wallpaper/light-1200.webp" alt="" width={1200} height={750} loading="lazy" decoding="async" />
          </div>
        )}
        <div className="lv-clip__poster">
          <ShotImages shot={shot} alt={alt} sizes="(max-width: 900px) 100vw, 640px" />
        </div>
        {clip && <video ref={vid} className="lv-clip__video" muted loop playsInline preload="none" aria-label={alt} />}
        <span className="lv-clip__badge">
          <span aria-hidden="true">▶</span> {t.landing.features.clip}
        </span>
        <span className="lv-clip__progress" aria-hidden="true">
          <i ref={bar} />
        </span>
      </div>
    </figure>
  );
}

/** The tour in the hero: the poster with a play button and the chapters. Plays (and seeks) only once CLIPS.tour exists. */
export function Tour() {
  const { t } = useSite();
  const L = t.landing.tour;
  const src = CLIPS.tour;
  const vid = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const play = (at?: number) => {
    const v = vid.current;
    if (!v || !src) return;
    if (!v.src) v.src = pickSrc(src);
    if (at !== undefined) v.currentTime = at;
    setPlaying(true);
    v.play().catch(() => {});
  };

  return (
    <div className={`lv-tour${playing ? ' is-playing' : ''}`} id="tour">
      <div className="lv-tour__media">
        <ShotImages shot="desktop" alt={L.alt} eager sizes="(max-width: 1200px) 100vw, 1120px" />
        {src && <video ref={vid} className="lv-tour__video" controls={playing} playsInline preload="none" aria-label={L.title} />}
        <div className="lv-tour__shade" aria-hidden="true" />
        {src ? (
          <button type="button" className="lv-play" onClick={() => play()} aria-label={L.play}>
            <span className="lv-play__tri" aria-hidden="true" />
          </button>
        ) : (
          <span className="lv-play lv-play--soon" role="img" aria-label={`${L.play}: ${L.soon}`}>
            <span className="lv-play__tri" aria-hidden="true" />
            <span className="lv-play__soon" aria-hidden="true">{L.soon}</span>
          </span>
        )}
      </div>
      <div className="lv-tour__info">
        <p className="lv-label">{L.label}</p>
        <p className="lv-tour__title">{L.title}</p>
        <ol className="lv-tour__chapters" aria-label={L.chaptersLabel}>
          {L.chapters.map((c) => (
            <li key={c.t}>
              {src ? (
                <button type="button" onClick={() => play(c.s)}>
                  <span>{c.t}</span> {c.label}
                </button>
              ) : (
                <>
                  <span>{c.t}</span> {c.label}
                </>
              )}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
