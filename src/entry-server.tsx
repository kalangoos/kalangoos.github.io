import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { App } from './App';
import type { Content, Lang } from './content';
import pt from './content/pt-BR.json';
import en from './content/en.json';

const CONTENT: Record<Lang, Content> = { 'pt-BR': pt, en };

export function render(lang: Lang): string {
  return renderToString(
    <StrictMode>
      <App lang={lang} t={CONTENT[lang]} />
    </StrictMode>,
  );
}
