import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { MembersApp } from './members/MembersApp';
import type { Content, Lang } from './content';
import type { PageId } from './lib/routes';
import pt from './content/pt-BR.json';
import en from './content/en.json';

const CONTENT = { 'pt-BR': pt, en } as unknown as Record<Lang, Content>;

export function render(lang: Lang, page: PageId): string {
  return renderToString(
    <StrictMode>
      <App lang={lang} t={CONTENT[lang]} page={page} />
    </StrictMode>,
  );
}

/** /membros/ before the session is known: the entry card (or "not connected" when the build has no login service). */
export function renderMembers(): string {
  return renderToString(
    <StrictMode>
      <MembersApp t={pt} />
    </StrictMode>,
  );
}
