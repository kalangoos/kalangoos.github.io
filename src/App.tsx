import { useMemo, useRef } from 'react';
import './styles/site.css';
import type { Content, Lang } from './content';
import { Site } from './lib/context';
import type { PageId } from './lib/routes';
import { useReveal } from './lib/useReveal';
import { Bar } from './components/Bar';
import { Dock } from './components/Dock';
import { Lightbox, type LightboxHandle } from './components/Lightbox';
import { Footer } from './sections/Sections';
import { Landing } from './landing/Landing';
import { NotFoundPage, SubPage } from './sections/SubPages';

export function App({ lang, t, page }: { lang: Lang; t: Content; page: PageId }) {
  const lb = useRef<LightboxHandle>(null);
  const ctx = useMemo(() => ({ t, lang, page, openShot: (s: string) => lb.current?.open(s) }), [t, lang, page]);
  useReveal();
  // the home page is the landing (its own menu and footer); the other pages keep the system's top bar and dock
  if (page === 'home') {
    return (
      <Site.Provider value={ctx}>
        <Landing />
      </Site.Provider>
    );
  }
  return (
    <Site.Provider value={ctx}>
      <a className="skip" href="#main">{t.a11y.skip}</a>
      <Bar />
      <main id="main">
        {page === 'notfound' ? <NotFoundPage /> : <SubPage id={page} />}
      </main>
      <Footer />
      {page !== 'notfound' && <Dock />}
      <Lightbox ref={lb} />
    </Site.Provider>
  );
}
