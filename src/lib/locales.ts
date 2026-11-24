import data from '../locales.json';

/** Keep in sync with src/locales.json `locales[].id`. */
export type LocaleId = 'pt-BR' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'ru' | 'zh-Hans' | 'ja';

export type Locale = {
  id: LocaleId;
  hreflang: string;
  ogLocale: string;
  prefix: string;
  short: string;
  nativeName: string;
  published: boolean;
};

export const ORIGIN: string = data.origin;
export const DEFAULT_LANG: LocaleId = data.default as LocaleId;
export const LOCALES: readonly Locale[] = data.locales as Locale[];

const byId = new Map(LOCALES.map((l) => [l.id, l]));

/** Locales that ship content and appear in the language switcher. */
export function publishedLocales(): Locale[] {
  return LOCALES.filter((l) => l.published);
}

export function localeOf(id: string): Locale | undefined {
  return byId.get(id as LocaleId);
}

export function isLocaleId(id: string): id is LocaleId {
  return byId.has(id as LocaleId);
}

type SlugMap = Record<string, string>;
const SLUGS = data.slugs as Record<string, { 'pt-BR'?: string; '*'?: string } & SlugMap>;

/** Path segment(s) for a sub-page in a given locale (no leading/trailing slash). */
export function slugOf(page: string, lang: LocaleId): string {
  const map = SLUGS[page];
  if (!map) throw new Error(`unknown page slug: ${page}`);
  return map[lang] ?? map['*'] ?? map['pt-BR']!;
}

/** Absolute site path for a page in a language (trailing slash, except 404). */
export function buildPath(lang: LocaleId, page: string): string {
  if (page === 'notfound') return '/404.html';
  const loc = localeOf(lang);
  if (!loc) throw new Error(`unknown locale: ${lang}`);
  if (page === 'home') return loc.prefix ? `/${loc.prefix}/` : '/';
  const slug = slugOf(page, lang);
  return loc.prefix ? `/${loc.prefix}/${slug}/` : `/${slug}/`;
}

/** Members-area path prefixes allowed after OAuth (open-redirect guard). */
export function membersPathPrefixes(): string[] {
  return publishedLocales().map((l) => buildPath(l.id, 'members'));
}
