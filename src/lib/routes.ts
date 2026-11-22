import routes from '../routes.json';
import type { Lang } from '../content';

export type PageId = 'home' | 'download' | 'security' | 'docs' | 'notes' | 'contribute' | 'members' | 'notfound';
export const ORIGIN: string = routes.origin;
export const PAGES = routes.pages as Record<PageId, Record<Lang, string>>;

/** The path of a page in a language (always with a trailing slash, except the 404 file). */
export function pathOf(lang: Lang, page: PageId): string {
  return PAGES[page][lang];
}
