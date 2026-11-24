import routes from '../routes.json';
import type { LocaleId } from './locales';
import { DEFAULT_LANG, ORIGIN as LOCALE_ORIGIN, publishedLocales } from './locales';

export type Lang = LocaleId;
export type PageId = 'home' | 'download' | 'security' | 'docs' | 'notes' | 'contribute' | 'members' | 'notfound';

export const ORIGIN: string = routes.origin ?? LOCALE_ORIGIN;
export const PAGES = routes.pages as Record<PageId, Record<Lang, string>>;

/** The path of a page in a language (always with a trailing slash, except the 404 file). */
export function pathOf(lang: Lang, page: PageId): string {
  return PAGES[page][lang];
}

/** Every published language id (order matches locales.json). */
export function langs(): Lang[] {
  return publishedLocales().map((l) => l.id);
}

export { DEFAULT_LANG };
