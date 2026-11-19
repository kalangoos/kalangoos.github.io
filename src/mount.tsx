import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { App } from './App';
import type { Content, Lang } from './content';

export function mount(lang: Lang, t: Content) {
  const root = document.getElementById('root')!;
  const app = (
    <StrictMode>
      <App lang={lang} t={t} />
    </StrictMode>
  );
  // pre-rendered pages hydrate; `npm run dev` renders from scratch
  if (root.firstElementChild) hydrateRoot(root, app);
  else createRoot(root).render(app);
  (window as Window & { __kalangoMounted?: boolean }).__kalangoMounted = true;
}
