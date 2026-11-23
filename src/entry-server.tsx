import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { MembersPage } from './members/MembersPage';
import type { Content, Lang } from './content';
import type { PageId } from './lib/routes';
import pt from './content/pt-BR.json';
import en from './content/en.json';

const CONTENT = { 'pt-BR': pt, en } as unknown as Record<Lang, Content>;

export function render(lang: Lang, page: PageId): string {
  return renderToString(
    <StrictMode>
      {page === 'members' ? <MembersPage lang={lang} t={CONTENT[lang]} /> : <App lang={lang} t={CONTENT[lang]} page={page} />}
    </StrictMode>,
  );
}
