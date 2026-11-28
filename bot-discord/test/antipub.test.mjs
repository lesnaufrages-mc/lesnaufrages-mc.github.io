import test from 'node:test';
import assert from 'node:assert/strict';
import { trouverInvitations, salonSurveille, ajouterAvertissement } from '../src/antipub.js';

test('repère les liens d\'invitation', () => {
  assert.deepEqual(trouverInvitations('rejoins https://discord.gg/abcDEF12 !'), ['abcDEF12']);
  assert.deepEqual(trouverInvitations('discord.com/invite/heartbreak'), ['heartbreak']);
  assert.deepEqual(trouverInvitations('discordapp.com/invite/xyz99'), ['xyz99']);
  assert.deepEqual(trouverInvitations('discord . gg / smp123'), ['smp123']);
  assert.deepEqual(trouverInvitations('dsc.gg/team'), ['team']);
  assert.deepEqual(trouverInvitations('salut, on joue sur le serveur ce soir ?'), []);
  assert.deepEqual(trouverInvitations('https://lesnaufrages.net/jouer/'), []);
});

const cat = (id, parentId, name = 'général') => ({ id, parentId, name, isThread: () => false });
test('salons surveillés : catégories publiques sauf pub et factions', () => {
  const C = ['100', '200'];
  assert.ok(salonSurveille(cat('1', '100', '📷・médias'), C, ['9'], ['faction']));
  assert.ok(!salonSurveille(cat('9', '100', 'publicité'), C, ['9'], ['faction']));
  assert.ok(!salonSurveille(cat('3', '200', '⚔️・factions'), C, ['9'], ['faction']));
  assert.ok(!salonSurveille(cat('4', '300', 'staff'), C, ['9'], ['faction']));
  const fil = { id: 'f', isThread: () => true, parent: cat('1', '100') };
  assert.ok(salonSurveille(fil, C, ['9'], ['faction']));
});

test('compte les avertissements', () => {
  const d = {};
  assert.equal(ajouterAvertissement('u', { raison: 'pub' }, d, () => {}), 1);
  assert.equal(ajouterAvertissement('u', { raison: 'pub' }, d, () => {}), 2);
});
