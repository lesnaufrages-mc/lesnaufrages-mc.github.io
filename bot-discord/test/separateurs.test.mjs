import { test } from 'node:test';
import assert from 'node:assert/strict';
import { separateursVoulus } from '../src/separateurs-membres.js';

test('séparateurs staff selon le grade', () => {
  const sep = { direction: 'D', staff: 'S' };
  assert.deepEqual(separateursVoulus([{ id: 'a', name: '💉・Admin' }], sep), { ajouter: ['D'], retirer: [] });
  assert.deepEqual(separateursVoulus([{ id: 'm', name: '☄️・Modérateur' }, { id: 'D', name: 'x' }], sep), { ajouter: ['S'], retirer: ['D'] });
  assert.deepEqual(separateursVoulus([{ id: 'x', name: '🍸・Membre' }], sep), { ajouter: [], retirer: [] });
});
