import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import { MembersPage } from './members/MembersPage';
import type { Content, Lang } from './content';
import type { PageId } from './lib/routes';

const modules = import.meta.glob('./content/*.json', { eager: true, import: 'default' }) as Record<string, Content>;

const CONTENT = Object.fromEntries(
  Object.entries(modules).map(([path, data]) => {
    const id = path.replace('./content/', '').replace(/\.json$/, '');
    return [id, data];
  }),
) as Record<Lang, Content>;

export function render(lang: Lang, page: PageId): string {
  const t = CONTENT[lang];
  if (!t) throw new Error(`missing content for ${lang}`);
  return renderToString(
    <StrictMode>
      {page === 'members' ? <MembersPage lang={lang} t={t} /> : <App lang={lang} t={t} page={page} />}
    </StrictMode>,
  );
}
