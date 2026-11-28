import { test } from 'node:test';
import assert from 'node:assert/strict';
import { invitationUtilisee, enregistrerArrivee, enregistrerDepart, donneesVides, topInvitations, valides, estBumpReussi, estBumpUpguild } from '../src/croissance.js';

test('trouve l\'invitation utilisée', () => {
  const avant = new Map([['a', { uses: 2 }], ['b', { uses: 0 }]]);
  const apres = new Map([['a', { uses: 2 }], ['b', { uses: 1 }]]);
  assert.equal(invitationUtilisee(avant, apres), 'b');
  assert.equal(invitationUtilisee(avant, avant), null);
  const unique = new Map([['c', { uses: 0, maxUses: 1 }]]);
  assert.equal(invitationUtilisee(unique, new Map()), 'c');
});

test('compte, paliers, départs, faux comptes', () => {
  const d = donneesVides();
  for (const m of ['m1', 'm2']) enregistrerArrivee(d, { membreId: m, invitantId: 'X', ageJours: 100 });
  const r = enregistrerArrivee(d, { membreId: 'm3', invitantId: 'X', ageJours: 100 });
  assert.equal(r.compte, 3);
  assert.equal(r.nouveauPalier.n, 3);
  assert.equal(enregistrerArrivee(d, { membreId: 'm4', invitantId: 'X', ageJours: 1 }).faux, true);
  assert.equal(valides(d.invitants.X), 3);
  enregistrerDepart(d, 'm1');
  assert.equal(valides(d.invitants.X), 2);
  // le même membre revient avec le même lien : pas recompté, palier pas redonné
  const retour = enregistrerArrivee(d, { membreId: 'm1', invitantId: 'X', ageJours: 100 });
  assert.equal(retour.compte, 2);
  assert.equal(retour.nouveauPalier, null);
  assert.equal(enregistrerArrivee(d, { membreId: 'X', invitantId: 'X', ageJours: 100 }), null);
  assert.equal(topInvitations(d)[0].id, 'X');
});

test('reconnaît un bump DISBOARD', () => {
  assert.ok(estBumpReussi({ author: { id: '302050872383242240' }, content: '', embeds: [{ description: 'Bump done! :thumbsup:' }] }));
  assert.ok(estBumpReussi({ author: { id: '302050872383242240' }, content: '', embeds: [{ description: 'Bump effectué !' }] }));
  assert.ok(!estBumpReussi({ author: { id: '302050872383242240' }, content: '', embeds: [{ description: 'Please wait another 1h' }] }));
  assert.ok(!estBumpReussi({ author: { id: '1' }, content: 'Bump done', embeds: [] }));
});

test('top du mois', async () => {
  const { topDuMois } = await import('../src/croissance.js');
  const d = donneesVides();
  const nov = Date.UTC(2026, 10, 10); const oct = Date.UTC(2026, 9, 10);
  d.membres = { a: { par: 'X', quand: nov }, b: { par: 'X', quand: nov }, c: { par: 'Y', quand: nov }, e: { par: 'Y', quand: oct }, f: { par: 'Y', quand: nov, parti: true }, g: { par: 'Z', quand: nov, faux: true } };
  assert.deepEqual(topDuMois(d, '2026-11'), [{ id: 'X', n: 2 }, { id: 'Y', n: 1 }]);
});

test('reconnaît un bump Upguild', () => {
  const up = { id: '1568683080171004045' };
  assert.ok(estBumpUpguild({ author: up, interactionMetadata: { name: 'bump' }, content: '', embeds: [{ title: 'Bump réussi', description: 'Ton serveur remonte !' }] }));
  assert.ok(!estBumpUpguild({ author: up, interactionMetadata: { name: 'bump' }, content: 'Tu dois attendre avant de bump à nouveau', embeds: [] }));
  assert.ok(!estBumpUpguild({ author: up, content: 'Le bump est disponible !', interactionMetadata: { name: 'aide' }, embeds: [] }));
  assert.ok(!estBumpUpguild({ author: { id: '1' }, content: 'Bump réussi', embeds: [] }));
});
