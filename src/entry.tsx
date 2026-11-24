import { mount } from './mount';
import type { Content, Lang } from './content';
import { isLocaleId } from './lib/locales';

const catalog = import.meta.glob('./content/*.json', { eager: true, import: 'default' }) as Record<string, Content>;

const raw = document.documentElement.lang;
if (!isLocaleId(raw)) throw new Error(`unknown document language: ${raw}`);
const lang: Lang = raw;
const t = catalog[`./content/${lang}.json`];
if (!t) throw new Error(`missing content file for ${lang}`);
mount(lang, t);
