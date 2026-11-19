import { Icon } from '../components/Icon';
import { AgentPanel } from '../components/AgentPanel';
import { CaptureChip, Eyebrow, Shot, WindowControls } from '../components/Bits';
import { useSite } from '../lib/context';

export function Hero() {
  const { t } = useSite();
  const H = t.hero;
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="container">
        <div className="hero__top">
          <div className="hero__text">
            <Eyebrow>{H.eyebrow}</Eyebrow>
            <h1 id="hero-title" className="display">{H.title}</h1>
            <p className="lead">{H.lead}</p>
            <div className="hero__ctas">
              <a className="btn btn--primary" href="#follow">{H.ctaPrimary}</a>
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
        <figure className="hero__shot">
          <div className="window">
            <div className="window__bar">
              <span className="window__title">
                <CaptureChip />
                <span className="mono">kalango-sessao · 1280×800</span>
              </span>
              <WindowControls />
            </div>
            <Shot shot="desktop" alt={H.shotAlt} eager sizes="(max-width: 1100px) 100vw, 1040px" />
          </div>
          <figcaption className="hero__caption">{H.shotCaption}</figcaption>
        </figure>
      </div>
    </section>
  );
}
