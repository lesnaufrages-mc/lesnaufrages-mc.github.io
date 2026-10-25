import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const M = createRequire(import.meta.url)('../docs/strategie/moteur.js');

test('la carte a des voisins symétriques', () => {
  const c = M.construireCarte();
  c.forEach((r) => {
    assert.ok(r.voisins.length > 0, r.nom);
    r.voisins.forEach((v) => assert.ok(c[v].voisins.includes(r.id)));
  });
});

test('les lanciers battent la cavalerie, la cavalerie bat les archers', () => {
  const duel = (a, b) => {
    const bt = M.creerBataille([{ t: a, hp: M.pvMax(a) }], [{ t: b, hp: M.pvMax(b) }], 3);
    return M.resoudreAuto(bt).gagnant;
  };
  assert.equal(duel('cav', 'lance'), 1);
  assert.equal(duel('cav', 'arc'), 0);
});

test('une campagne avance sans erreur', () => {
  const e = M.nouvellePartie(42);
  assert.equal(M.recruter(e, 0, 'lance'), null);
  for (let i = 0; i < 15 && !e.fin; i++) {
    M.finDuTour(e).forEach((att) => {
      const b = M.creerBataille(att.unites, e.regions[att.vers].armee, i);
      M.resoudreAuto(b);
      M.appliquerBataille(e, att, b);
    });
  }
  assert.ok(e.tour > 1);
});
