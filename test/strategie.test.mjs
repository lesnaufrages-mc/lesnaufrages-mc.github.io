import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../docs/strategie/moteur.js');
const H = require('../docs/strategie/histoire.js');

test('la carte a des voisins symétriques', () => {
  M.PROV.forEach((p, i) => {
    assert.ok(p.voisins.length > 0, p.nom);
    p.voisins.forEach((v) => assert.ok(M.PROV[v].voisins.includes(i), p.nom + ' / ' + M.PROV[v].nom));
  });
});

test('chaque époque cite des provinces existantes, une seule fois', () => {
  const ids = M.PROV.map((p) => p.id);
  H.EPOQUES.forEach((e) => {
    const vu = new Set();
    e.factions.forEach((f) => f[3].forEach((p) => {
      assert.ok(ids.includes(p), e.id + ' : ' + p);
      assert.ok(!vu.has(p), e.id + ' : ' + p + ' en double');
      vu.add(p);
    }));
  });
});

const duel = (a, b, opts) => {
  const u = (t) => ({ t, hp: M.pvMax(t) });
  const bt = M.creerBataille(a.map(u), b.map(u), 3, opts);
  return M.resoudreAuto(bt).gagnant;
};

test('pierre-feuille-ciseaux', () => {
  assert.equal(duel(['cav'], ['milice']), 1);
  assert.equal(duel(['cav'], ['arc']), 0);
  assert.equal(duel(['chevalier'], ['piquier']), 1);
});

test('les remparts aident le défenseur, les canons les abattent', () => {
  const att = ['epee', 'epee', 'milice'], def = ['epee', 'arc'];
  assert.equal(duel(att, def, { defenseur: 1, murs: 0 }), 0);
  assert.equal(duel(att, def, { defenseur: 1, murs: 3 }), 1);
  assert.equal(duel(['epee', 'epee', 'milice', 'canon', 'canon'], def, { defenseur: 1, murs: 3 }), 0);
});

test('les unités et bâtiments respectent l\'époque', () => {
  const e = M.nouvellePartie('charlemagne', 'francs', 1);
  const paris = M.PROV.findIndex((p) => p.id === 'paris');
  assert.match(M.recruter(e, paris, 'arquebuse'), /1450/);
  assert.equal(M.recruter(e, paris, 'milice'), null);
  assert.equal(M.construire(e, paris, 'ferme'), null);
  assert.match(M.construire(e, paris, 'murs'), /chantier/);
});

test('chaque campagne avance jusqu\'au bout sans erreur', () => {
  H.EPOQUES.forEach((ep) => {
    const e = M.nouvellePartie(ep.id, ep.factions[0][0], 42);
    for (let i = 0; i < 400 && !e.fin; i++) {
      M.finDuTour(e).forEach((att) => {
        const b = M.batailleAttaque(e, att, i);
        M.resoudreAuto(b);
        M.appliquerBataille(e, att, b);
      });
    }
    assert.ok(e.fin, ep.id);
  });
});
