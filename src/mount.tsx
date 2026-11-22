import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import type { Content, Lang } from './content';
import type { PageId } from './lib/routes';

export function mount(lang: Lang, t: Content) {
  const root = document.getElementById('root')!;
  // the pre-render writes the page id on <html data-page>
  const page = (document.documentElement.dataset.page ?? 'home') as PageId;
  const app = (
    <StrictMode>
      <App lang={lang} t={t} page={page} />
    </StrictMode>
  );
  // pre-rendered pages hydrate; `npm run dev` renders from scratch
  if (root.firstElementChild) hydrateRoot(root, app);
  else createRoot(root).render(app);
  (window as Window & { __kalangoMounted?: boolean }).__kalangoMounted = true;
}
