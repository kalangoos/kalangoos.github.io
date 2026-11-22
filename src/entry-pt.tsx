import { mount } from './mount';
import type { Content } from './content';
import t from './content/pt-BR.json';

mount('pt-BR', t as unknown as Content);
