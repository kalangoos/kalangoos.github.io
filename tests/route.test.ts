// The members area's hash routes: malformed or hostile addresses never throw and never put attacker text on the page.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DOC, parseRoute, validLogin } from '../src/members/route.ts';

test('routes: docs by default, spec, board, error', () => {
  assert.deepEqual(parseRoute(''), { view: 'docs', path: DEFAULT_DOC, heading: undefined });
  assert.deepEqual(parseRoute('#/docs/docs/PLANO.md?h=fase-1'), { view: 'docs', path: 'docs/PLANO.md', heading: 'fase-1' });
  assert.deepEqual(parseRoute('#/spec/c/fase-1-shell/tarefas'), { view: 'spec', kind: 'c', id: 'fase-1-shell', tab: 'tarefas' });
  assert.deepEqual(parseRoute('#/quadro'), { view: 'board' });
  assert.deepEqual(parseRoute('#/erro'), { view: 'error' });
});

test('a malformed escape in the address does not throw', () => {
  for (const h of ['#/%', '#/docs/%E0%A4%A', '#/%zz', '#%', '#/fora?login=%']) assert.doesNotThrow(() => parseRoute(h), h);
  assert.equal(parseRoute('#/%').view, 'docs');
});

test('#/fora names the account only when it is a GitHub login; any other text is dropped', () => {
  assert.deepEqual(parseRoute('#/fora?login=lia-souza'), { view: 'outside', login: 'lia-souza' });
  for (const bad of ['<b>admin</b>', 'sua conta foi hackeada, ligue 0800', 'a'.repeat(40), 'x y', 'a_b', '', '%3Cscript%3E', 'é'])
    assert.deepEqual(parseRoute(`#/fora?login=${encodeURIComponent(bad)}`), { view: 'outside', login: '' }, bad);
  assert.deepEqual(parseRoute('#/fora'), { view: 'outside', login: '' });
  assert.equal(validLogin('a'.repeat(39)), 'a'.repeat(39));
  assert.equal(validLogin(null), '');
});
