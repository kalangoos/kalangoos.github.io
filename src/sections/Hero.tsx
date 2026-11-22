import { Icon } from '../components/Icon';
import { AgentPanel } from '../components/AgentPanel';
import { CaptureChip, Eyebrow, Shot, WindowControls } from '../components/Bits';
import { useSite } from '../lib/context';
import { pathOf } from '../lib/routes';

export function Hero() {
  const { t, lang } = useSite();
  const H = t.hero;
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="container">
        <div className="hero__top">
          <div className="hero__text">
            {/* the full logo on the plain background (brand rule: over a wallpaper only the one-colour version) */}
            <p className="hero__logo">
              <img className="only-dark" src="/img/brand/badge.webp" width="640" height="654" alt="KalangoOS" fetchPriority="high" />
              <img className="only-light" src="/img/brand/badge-light.webp" width="640" height="658" alt="KalangoOS" loading="lazy" />
            </p>
            <Eyebrow>{H.eyebrow}</Eyebrow>
            <h1 id="hero-title" className="display">{H.title}</h1>
            <p className="lead">{H.lead}</p>
            <div className="hero__ctas">
              <a className="btn btn--primary" href={pathOf(lang, 'download')}>{H.ctaPrimary}</a>
              <a className="btn btn--secondary" href="#roadmap">{H.ctaSecondary}</a>
            </div>
            <p className="hero__note">
              <Icon name="info" />
              <span>{H.note}</span>
            </p>
            <ul className="chips">
              {H.chips.map((c) => (
                <li key={c} className="chip">{c}</li>
              ))}
            </ul>
          </div>
          <AgentPanel />
        </div>
      </div>
      <div className="hero__stage">
        <figure className="container hero__shot">
          <div className="window">
            <div className="window__bar">
              <span className="window__title">
                <CaptureChip />
                <span className="mono">kalango-sessao · 1280×800</span>
              </span>
              <WindowControls />
            </div>
            <Shot shot="desktop" alt={H.shotAlt} eager sizes="(max-width: 1360px) 100vw, 1280px" />
          </div>
          <figcaption className="hero__caption">{H.shotCaption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
