import { useMemo, useRef } from 'react';
import './styles/site.css';
import type { Content, Lang } from './content';
import { Site } from './lib/context';
import type { PageId } from './lib/routes';
import { useReveal } from './lib/useReveal';
import { Bar } from './components/Bar';
import { Dock } from './components/Dock';
import { Lightbox, type LightboxHandle } from './components/Lightbox';
import { Hero } from './sections/Hero';
import { Agents } from './sections/Agents';
import { Desktop, Faq, Follow, Footer, Gallery, Platform, Privacy, Promises, Roadmap, Security, Stack, Undo } from './sections/Sections';
import { NotFoundPage, SubPage } from './sections/SubPages';

export function App({ lang, t, page }: { lang: Lang; t: Content; page: PageId }) {
  const lb = useRef<LightboxHandle>(null);
  const ctx = useMemo(() => ({ t, lang, page, openShot: (s: string) => lb.current?.open(s) }), [t, lang, page]);
  useReveal();
  return (
    <Site.Provider value={ctx}>
      <a className="skip" href="#main">{t.a11y.skip}</a>
      <Bar />
      <main id="main">
        {page === 'home' ? (
          <>
            <Hero />
            <Promises />
            <Agents />
            <Undo />
            <Privacy />
            <Security />
            <Platform />
            <Desktop />
            <Gallery />
            <Stack />
            <Roadmap />
            <Faq />
            <Follow />
          </>
        ) : page === 'notfound' ? (
          <NotFoundPage />
        ) : (
          <SubPage id={page} />
        )}
      </main>
      <Footer />
      {page !== 'notfound' && <Dock />}
      <Lightbox ref={lb} />
    </Site.Provider>
  );
}
