import { useMemo } from 'react';
import './styles/site.css';
import type { Content, Lang } from './content';
import { Site } from './lib/context';
import type { PageId } from './lib/routes';
import { useReveal } from './lib/useReveal';
import { Landing, SiteFooter, SiteHeader } from './landing/Landing';
import { NotFoundPage, SubPage } from './sections/SubPages';

export function App({ lang, t, page }: { lang: Lang; t: Content; page: PageId }) {
  const ctx = useMemo(() => ({ t, lang, page }), [t, lang, page]);
  useReveal();
  if (page === 'home') {
    return (
      <Site.Provider value={ctx}>
        <Landing />
      </Site.Provider>
    );
  }
  // the other pages share the landing's menu and footer (in .lv--chrome, which adds no box: the menu stays sticky)
  return (
    <Site.Provider value={ctx}>
      <div className="lv lv--chrome">
        <SiteHeader />
      </div>
      <main id="main">{page === 'notfound' ? <NotFoundPage /> : <SubPage id={page} />}</main>
      <div className="lv lv--chrome">
        <SiteFooter />
      </div>
    </Site.Provider>
  );
}
