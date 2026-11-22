import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import type { Content, Lang } from './content';
import type { PageId } from './lib/routes';

export async function mount(lang: Lang, t: Content) {
  const root = document.getElementById('root')!;
  // the pre-render writes the page id on <html data-page>
  const page = (document.documentElement.dataset.page ?? 'home') as PageId;
  let body;
  if (page === 'members') {
    const { MembersPage } = await import('./members/MembersPage'); // only this page needs the members area's code
    body = <MembersPage lang={lang} t={t} />;
  } else body = <App lang={lang} t={t} page={page} />;
  const app = <StrictMode>{body}</StrictMode>;
  // pre-rendered pages hydrate; `npm run dev` renders from scratch
  if (root.firstElementChild) hydrateRoot(root, app);
  else createRoot(root).render(app);
  (window as Window & { __kalangoMounted?: boolean }).__kalangoMounted = true;
}
