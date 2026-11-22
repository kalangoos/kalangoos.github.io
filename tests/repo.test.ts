// Parsing of the public repository: catalogue, OpenSpec tasks, links between documents, search.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { docCatalog, imageSrc, linkTarget, parseMeta, parseTasks, progress, resolvePath, searchText, slugTitle, slugify, specCatalog } from '../src/members/repo.ts';

const TREE = [
  'README.md', 'AGENTS.md', 'ROADMAP.md', 'Cargo.toml',
  'docs/PLANO.md', 'docs/ARQUITETURA.md', 'docs/NOVO-DOC.md', 'docs/especificacao/index.html',
  'openspec/specs/marca/spec.md', 'openspec/specs/aparencia/spec.md',
  'openspec/changes/fase-1-shell/proposal.md', 'openspec/changes/fase-1-shell/tasks.md', 'openspec/changes/fase-1-shell/.openspec.yaml',
  'openspec/changes/fase-1-shell/specs/shell/dock/spec.md', 'openspec/changes/fase-0-fundacoes/tasks.md',
  'openspec/changes/archive/.gitkeep',
];

test('docs catalogue: root documents first, docs/ in reading order, unknown docs by file name, no html', () => {
  const c = docCatalog(TREE);
  assert.deepEqual(c.map((d) => d.path), ['README.md', 'AGENTS.md', 'ROADMAP.md', 'docs/ARQUITETURA.md', 'docs/PLANO.md', 'docs/NOVO-DOC.md']);
  assert.equal(c.find((d) => d.path === 'docs/ARQUITETURA.md')!.label, 'Arquitetura');
  assert.equal(c.at(-1)!.label, 'NOVO DOC');
});

test('slug titles get their accents back', () => {
  assert.equal(slugTitle('fase-0-fundacoes'), 'Fase 0 · Fundações');
  assert.equal(slugTitle('fase-1-shell'), 'Fase 1 · Shell');
  assert.equal(slugTitle('aparencia'), 'Aparência');
  assert.equal(slugTitle('barra-de-comando'), 'Barra de comando');
});

test('spec catalogue: specs, active changes (archive left out), their files and delta specs', () => {
  const { specs, changes } = specCatalog(TREE);
  assert.deepEqual(specs.map((s) => s.label), ['Aparência', 'Marca']);
  assert.deepEqual(changes.map((c) => c.id), ['fase-0-fundacoes', 'fase-1-shell']);
  const shell = changes[1]!;
  assert.equal(shell.files.tasks, 'openspec/changes/fase-1-shell/tasks.md');
  assert.equal(shell.files.design, undefined);
  assert.deepEqual(shell.specs, ['openspec/changes/fase-1-shell/specs/shell/dock/spec.md']);
});

test('tasks.md: groups, ids with letters, nested items, progress', () => {
  const md = `# Tasks\n\n## 1. Sessão\n\n- [x] 1.1a Arquivo de sessão\n- [ ] 1.1 Escolher KalangoOS\n  - [X] 1.1.1 Subtarefa\n\n## 2. Barra\n\n- [ ] Sem número\n`;
  const g = parseTasks(md);
  assert.deepEqual(g.map((x) => x.title), ['1. Sessão', '2. Barra']);
  assert.deepEqual(g[0]!.tasks.map((t) => [t.done, t.id]), [[true, '1.1a'], [false, '1.1'], [true, '1.1.1']]);
  assert.deepEqual(g[1]!.tasks[0], { done: false, id: '', text: 'Sem número' });
  assert.deepEqual(progress(g), { done: 2, total: 4 });
  assert.deepEqual(parseMeta('schema: spec-driven\ncreated: 2026-11-15\n'), { schema: 'spec-driven', created: '2026-11-15' });
});

test('links: other documents and specs open inside the area, the rest on GitHub', () => {
  const docs = new Set(docCatalog(TREE).map((d) => d.path));
  assert.equal(resolvePath('docs/README.md', '../openspec'), 'openspec');
  assert.deepEqual(linkTarget('docs/README.md', 'PLANO.md', docs), { kind: 'doc', href: '#/docs/docs/PLANO.md' });
  assert.deepEqual(linkTarget('docs/ARQUITETURA.md', 'PLANO.md#fase-1', docs), { kind: 'doc', href: '#/docs/docs/PLANO.md?h=fase-1' });
  assert.deepEqual(linkTarget('README.md', 'openspec/specs/marca/spec.md', docs), { kind: 'spec', href: '#/spec/s/marca' });
  assert.deepEqual(linkTarget('README.md', 'openspec/changes/fase-1-shell/tasks.md', docs), { kind: 'change', href: '#/spec/c/fase-1-shell' });
  assert.deepEqual(linkTarget('docs/README.md', '../openspec', docs), { kind: 'external', href: 'https://github.com/kalangoos/kalangoos/tree/main/openspec' });
  assert.deepEqual(linkTarget('docs/README.md', 'especificacao/index.html', docs), { kind: 'external', href: 'https://github.com/kalangoos/kalangoos/blob/main/docs/especificacao/index.html' });
  assert.deepEqual(linkTarget('README.md', '#seguranca', docs), { kind: 'anchor', href: 'seguranca' });
  assert.equal(linkTarget('README.md', 'https://kalangoos.com', docs).kind, 'external');
  assert.deepEqual(linkTarget('README.md', 'javascript:alert(1)', docs), { kind: 'external', href: '' });
  assert.equal(imageSrc('docs/A.md', '../.github/x.png'), 'https://raw.githubusercontent.com/kalangoos/kalangoos/main/.github/x.png');
  assert.equal(imageSrc('README.md', 'data:image/svg+xml,<svg/>'), '');
});

test('heading ids and search ignore accents the way readers expect', () => {
  assert.equal(slugify('3. O "MCP do sistema" (D9)'), '3-o-mcp-do-sistema-d9');
  assert.equal(slugify('Por que Ubuntu LTS e não Debian'), 'por-que-ubuntu-lts-e-não-debian');
  const hits = searchText('docs/X.md', '# Título\nO compositor **niri** é rápido.\nOutra linha\n', 'compositor niri');
  assert.equal(hits.length, 1);
  assert.equal(hits[0]!.line, 2);
  assert.equal(hits[0]!.snippet.slice(hits[0]!.at, hits[0]!.at + hits[0]!.length), 'compositor');
  assert.equal(searchText('x', 'Segurança do sistema', 'seguranca').length, 1);
});
