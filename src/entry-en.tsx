import { mount } from './mount';
import type { Content } from './content';
import en from './content/en.json';

mount('en', en as unknown as Content); // scripts/check-content.mjs checks that en.json has every key of pt-BR.json
