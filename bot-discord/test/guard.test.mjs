import test from 'node:test';
import assert from 'node:assert/strict';
import { Compteur, estArnaque, mentionneTout, SEUILS } from '../src/guard.js';

test('compteur sur fenêtre glissante', () => {
  const c = new Compteur(10_000);
  assert.equal(c.ajouter('t', 'salons', 'a', 0), 1);
  assert.equal(c.ajouter('t', 'salons', 'b', 3000), 2);
  assert.equal(c.ajouter('k', 'salons', 'x', 3000), 1); // autre auteur
  assert.equal(c.ajouter('t', 'roles', 'r', 3000), 1); // autre type
  assert.equal(c.ajouter('t', 'salons', 'c', 9000), 3);
  assert.deepEqual(c.cibles('t', 'salons'), ['a', 'b', 'c']);
  assert.equal(c.ajouter('t', 'salons', 'd', 12_500), 3); // « a » est sorti de la fenêtre
  assert.ok(SEUILS.salonsSupprimes >= 2);
});

test('arnaques et mentions', () => {
  assert.ok(estArnaque('@everyone 🎁 FREE NITRO → discord-gift.xyz'));
  assert.ok(estArnaque('Nitro gratuit ici'));
  assert.ok(estArnaque('dlscord.com/gift'));
  assert.ok(!estArnaque('gn guys'));
  assert.ok(!estArnaque('le serveur redémarre à 5 h'));
  assert.ok(mentionneTout({ content: 'yo @everyone' }));
  assert.ok(mentionneTout({ mentions: { everyone: true }, content: '' }));
  assert.ok(!mentionneTout({ content: 'salut' }));
});
