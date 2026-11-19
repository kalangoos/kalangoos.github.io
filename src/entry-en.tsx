import { mount } from './mount';
import type { Content } from './content';
import en from './content/en.json';

const t: Content = en; // the English file must have every key of pt-BR.json
mount('en', t);
