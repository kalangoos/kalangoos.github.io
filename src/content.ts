import type pt from './content/pt-BR.json';
import type { LocaleId } from './lib/locales';

export type Lang = LocaleId;

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

/** The site's text: one JSON per published locale under src/content/ (scripts/check-content.mjs fails the build
 *  when a published locale does not mirror pt-BR.json). The sub-pages are declared above because JSON cannot narrow `kind`. */
export type Content = Omit<typeof pt, 'pages'> & { pages: Record<SubPageId, PageContent> & { notfound: NotFound } };

/** Each capture: its size, whether a small copy exists (`-640`, or `-<sw>`), whether a light-theme copy exists, and its
 *  folder under /img (default `shots`). The `ds/` ones are frames exported from the KalangoOS Design System (FigCraft),
 *  1920×1080 plus a 960 copy, dark and light (each from the DS's own light-theme frame). */
export const SHOTS: Record<string, { w: number; h: number; small?: boolean; light?: boolean; dir?: string; sw?: number }> = {
  'ds-desktop': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-central': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-criar-agente': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-linha-tempo': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-memoria': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-loja': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-aprovar-tela': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-privacidade': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-instalador': { w: 1920, h: 1080, small: true, light: true, dir: 'ds', sw: 960 },
  'ds-capa': { w: 1440, h: 810, small: true },
  'ds-fundamentos': { w: 1440, h: 900, small: true },
  'ds-marca': { w: 1440, h: 900, small: true },
  'ds-site': { w: 1440, h: 900, small: true },
};

