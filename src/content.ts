import type pt from './content/pt-BR.json';

export type Lang = 'pt-BR' | 'en';

/** One item of a content block: a card, a step or a link (the fields each kind uses are in Blocks.tsx). */
export type Item = { title?: string; text?: string; badge?: string; code?: string; label?: string; href?: string; link?: { label: string; href: string; text?: string } };
/** A block of a sub-page; `kind` is text | cards | checks | steps | links | notice | todo. Links to other pages are "@id". */
export type Block = { kind: string; title?: string; tone?: string; text?: string; note?: string; paras?: string[]; items?: Array<string | Item>; link?: { label: string; href: string } };
export type PageContent = { title: string; description: string; eyebrow: string; h1: string; lead: string; blocks: Block[]; /** one line the maintainers edit before a release: "not yet in this version" (notes page only) */ pending?: string };
export type NotFound = {
  title: string; description: string; eyebrow: string; h1: string; lead: string; home: string;
  other: { lang: string; h: string; text: string; home: string; href: string };
};
export type SubPageId = 'download' | 'security' | 'docs' | 'notes' | 'contribute';

/** The site's text: src/content/pt-BR.json and src/content/en.json have the same shape (scripts/check-content.mjs
 *  fails the build when they do not). The sub-pages are declared above because JSON cannot narrow `kind`. */
export type Content = Omit<typeof pt, 'pages'> & { pages: Record<SubPageId, PageContent> & { notfound: NotFound } };

/** Every screenshot on the page: real captures from the KalangoOS test session (see site/README.md). */
/** small: there is a 640 px version too; light: there is a capture of the same screen in the light theme (<name>-light). */
export const SHOTS: Record<string, { w: number; h: number; small?: boolean; light?: boolean }> = {
  desktop: { w: 1280, h: 800, small: true, light: true },
  'files-agent': { w: 1280, h: 800, small: true, light: true },
  documents: { w: 1280, h: 800, small: true, light: true },
  'command-ui': { w: 1280, h: 800, small: true, light: true },
  'new-agent': { w: 1280, h: 800, small: true, light: true },
  'chat-changes': { w: 1280, h: 800, small: true, light: true },
  'privacy-panel': { w: 460, h: 590, light: true },
  'monitor-agents': { w: 1280, h: 800, small: true, light: true },
  'install-agent': { w: 1280, h: 800, small: true, light: true },
  today: { w: 1280, h: 800, small: true, light: true },
  spaces: { w: 1280, h: 800, small: true, light: true },
  lock: { w: 1280, h: 800, small: true, light: true },
  appearance: { w: 1280, h: 800, small: true, light: true },
  editor: { w: 1280, h: 800, small: true, light: true },
  music: { w: 1280, h: 800, small: true, light: true },
  help: { w: 1280, h: 800, small: true, light: true },
  'chat-data': { w: 1280, h: 800, small: true, light: true },
  calculator: { w: 1280, h: 800, small: true, light: true },
  'first-use': { w: 699, h: 320, light: true },
};
