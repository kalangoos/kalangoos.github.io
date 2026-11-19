import { useMemo, useRef } from 'react';
import './styles/site.css';
import type { Content, Lang } from './content';
import { Site } from './lib/context';
import { useReveal } from './lib/useReveal';
import { Bar } from './components/Bar';
import { Dock } from './components/Dock';
import { Lightbox, type LightboxHandle } from './components/Lightbox';
import { Hero } from './sections/Hero';
import { Agents } from './sections/Agents';
import { Desktop, Faq, Follow, Footer, Gallery, Privacy, Promises, Roadmap, Security, Stack, Undo } from './sections/Sections';

export function App({ lang, t }: { lang: Lang; t: Content }) {
  const lb = useRef<LightboxHandle>(null);
  const ctx = useMemo(() => ({ t, lang, openShot: (s: string) => lb.current?.open(s) }), [t, lang]);
  useReveal();
  return (
    <Site.Provider value={ctx}>
      <a className="skip" href="#main">{t.a11y.skip}</a>
      <Bar />
      <main id="main">
        <Hero />
        <Promises />
        <Agents />
        <Undo />
        <Privacy />
        <Security />
        <Desktop />
        <Gallery />
        <Stack />
        <Roadmap />
        <Faq />
        <Follow />
      </main>
      <Footer />
      <Dock />
      <Lightbox ref={lb} />
    </Site.Provider>
  );
}
