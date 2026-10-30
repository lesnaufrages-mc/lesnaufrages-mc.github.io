import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { decider, empreinte, JEUX } = require('../docs/sauvegarde.js');

const U = 'joueur-1';
const ligne = (o) => ({ donnees: { k: '1' }, maj: '2026-10-30T10:00:00+00:00', reset_le: null, ...o });

test('premier passage connecté', () => {
  assert.equal(decider({}, null, U, false), 'envoyer');            // partie locale, rien en ligne
  assert.equal(decider({}, null, U, true), 'rien');                // rien nulle part
  assert.equal(decider({ sale: true }, ligne(), U, false), 'recuperer'); // la partie du compte passe avant
});

test('même compte, même appareil', () => {
  const info = { uid: U, synchro: ligne().maj, reset: null };
  assert.equal(decider(info, ligne(), U, false), 'rien');
  assert.equal(decider({ ...info, sale: true }, ligne(), U, false), 'envoyer');
  // Joué sur un autre appareil entre-temps
  assert.equal(decider(info, ligne({ maj: '2026-10-30T11:00:00+00:00' }), U, false), 'recuperer');
  // Joué ici hors ligne APRÈS l'autre appareil : on garde celle d'ici
  const ici = { ...info, sale: true, local: Date.parse('2026-10-30T12:00:00Z') };
  assert.equal(decider(ici, ligne({ maj: '2026-10-30T11:00:00+00:00' }), U, false), 'envoyer');
});

test('remise à zéro par un admin', () => {
  const info = { uid: U, synchro: ligne().maj, reset: null, sale: true };
  const reset = ligne({ donnees: null, maj: '2026-10-30T12:00:00+00:00', reset_le: '2026-10-30T12:00:00+00:00' });
  assert.equal(decider(info, reset, U, false), 'effacer');
  // Déjà vue : on rejoue normalement
  const vu = { uid: U, synchro: reset.maj, reset: reset.reset_le };
  assert.equal(decider(vu, reset, U, true), 'rien');
  assert.equal(decider({ ...vu, sale: true }, reset, U, false), 'envoyer');
  // Rejoué ailleurs après la remise à zéro : cet appareil reprend la nouvelle partie
  assert.equal(decider(info, { ...reset, donnees: { k: '2' }, maj: '2026-10-30T13:00:00+00:00' }, U, false), 'recuperer');
  // Un autre compte se connecte sur cet appareil : sa remise à zéro efface la partie locale
  assert.equal(decider({ uid: 'autre', reset: reset.reset_le }, reset, U, false), 'effacer');
});

test('empreinte et clés des jeux', () => {
  assert.notEqual(empreinte('{"a":"1"}'), empreinte('{"a":"2"}'));
  assert.equal(empreinte('abc'), empreinte('abc'));
  assert.deepEqual(Object.keys(JEUX), ['mot-mystere', 'clutch', 'imperium']);
});
