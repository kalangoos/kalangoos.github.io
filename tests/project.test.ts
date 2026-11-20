// The board's GraphQL mapping on a sample response (tests/fixtures/project-v2-sample.json).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { facets, mapProject, matches, NO_FILTER, NO_STATUS, pickProject, shortRef } from '../src/members/project.ts';

const sample = JSON.parse(readFileSync(new URL('./fixtures/project-v2-sample.json', import.meta.url), 'utf8'));

test('columns follow the Status options, with "Sem status" first and unknown statuses at the end', () => {
  const b = mapProject(sample)!;
  assert.deepEqual(b.columns.map((c) => c.name), [NO_STATUS, 'A fazer', 'Em andamento', 'Em revisão', 'Feito', 'Bloqueado']);
  assert.equal(b.title, 'Roteiro do KalangoOS');
  assert.equal(b.url, 'https://github.com/orgs/kalangoos/projects/1');
  assert.equal(b.columns.find((c) => c.name === 'Em andamento')!.color, 'YELLOW');
});

test('archived items are left out', () => {
  const all = mapProject(sample)!.columns.flatMap((c) => c.items);
  assert.equal(all.length, 6);
  assert.ok(!all.some((i) => i.title.startsWith('Arquivado')));
});

test('issues carry repo, labels, assignees and the linked pull request', () => {
  const ilha = mapProject(sample)!.columns.flatMap((c) => c.items).find((i) => i.number === 24)!;
  assert.equal(ilha.kind, 'issue');
  assert.equal(ilha.state, 'open');
  assert.equal(ilha.repo, 'kalangoos/kalangoos');
  assert.deepEqual(ilha.labels.map((l) => l.name), ['shell', 'movimento']);
  assert.deepEqual(ilha.assignees.map((a) => a.login), ['lia-souza']);
  assert.deepEqual(ilha.links, [{ kind: 'pr', number: 57, url: 'https://github.com/kalangoos/kalangoos/pull/57', repo: 'kalangoos/kalangoos' }]);
});

test('pull requests: merged state, closing issues, label colours without "#"', () => {
  const items = mapProject(sample)!.columns.flatMap((c) => c.items);
  const merged = items.find((i) => i.number === 14)!;
  assert.equal(merged.kind, 'pr');
  assert.equal(merged.state, 'merged');
  assert.deepEqual(merged.links.map((l) => [l.kind, l.number]), [['issue', 9]]);
  const site = items.find((i) => i.number === 3)!;
  assert.equal(site.labels[0].color, '8ed2c3');
  assert.equal(shortRef(site.repo, site.number), 'kalangoos.github.io#3');
});

test('drafts and redacted items keep their place without links or content', () => {
  const b = mapProject(sample)!;
  const draft = b.columns[0].items[0];
  assert.equal(draft.kind, 'draft');
  assert.equal(draft.url, null);
  const redacted = b.columns.at(-1)!.items[0];
  assert.equal(redacted.kind, 'redacted');
  assert.equal(redacted.title, '');
});

test('the latest-open-project query shape maps the same way; no project gives null', () => {
  const p = sample.organization.projectV2;
  const latest = { organization: { viewerIsAMember: true, projectsV2: { nodes: [p] } } };
  assert.equal(pickProject(latest)!.title, 'Roteiro do KalangoOS');
  assert.deepEqual(mapProject(latest)!.columns.map((c) => c.items.length), mapProject(sample)!.columns.map((c) => c.items.length));
  assert.equal(mapProject({ organization: { viewerIsAMember: true, projectsV2: { nodes: [] } } }), null);
  assert.equal(mapProject(null), null);
});

test('filters: text without accents, assignee, label, repository and "só os meus"', () => {
  const items = mapProject(sample)!.columns.flatMap((c) => c.items);
  const count = (f: Partial<typeof NO_FILTER>) => items.filter((i) => matches(i, { ...NO_FILTER, ...f })).length;
  assert.equal(count({ text: 'musica' }), 1);
  assert.equal(count({ assignee: 'lia-souza' }), 2);
  assert.equal(count({ label: 'shell' }), 2);
  assert.equal(count({ repo: 'kalangoos/kalangoos.github.io' }), 1);
  assert.equal(count({ mine: 'davi-t' }), 1);
  assert.deepEqual(facets(mapProject(sample)!).repos, ['kalangoos/kalangoos', 'kalangoos/kalangoos.github.io']);
});
