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

test('diplomatie : paix, alliance, aide et guerre', () => {
  const e = M.nouvellePartie('charlemagne', 'francs', 7);
  const liste = M.diplomatie(e);
  assert.ok(liste.length > 5);
  liste.forEach((d) => assert.ok(['paix', 'guerre'].includes(d.rel)));
  const loin = liste.find((d) => !d.voisin);
  const f = loin.f;
  // Une alliance demande une bonne humeur.
  e.diplo[f].att = 10;
  assert.equal(M.proposer(e, f, 'alliance').ok, false);
  e.tour++;
  e.diplo[f].att = 55;
  assert.equal(M.proposer(e, f, 'alliance').ok, true);
  assert.equal(M.relation(e, f), 'alliance');
  // Un allié envoie de l'or puis attend avant d'aider encore.
  e.tour++;
  e.factions[f].or = 500;
  const or = e.factions[e.joueur].or;
  assert.equal(M.proposer(e, f, 'aideOr').ok, true);
  assert.ok(e.factions[e.joueur].or > or);
  e.tour++;
  assert.equal(M.proposer(e, f, 'aideTroupes').ok, false);
  // On ne peut pas attaquer un royaume en paix sans déclarer la guerre.
  const voisin = liste.find((d) => d.voisin);
  e.diplo[voisin.f].rel = 'paix';
  const mienne = e.provinces.findIndex((p, i) => p.proprio === e.joueur && M.PROV[i].voisins.some((v) => e.provinces[v].proprio === voisin.f));
  const cible = M.PROV[mienne].voisins.find((v) => e.provinces[v].proprio === voisin.f);
  const att = M.preparerAttaque(e, mienne, cible, [0]);
  assert.ok(att.erreur && att.paix === voisin.f);
  assert.equal(M.proposer(e, voisin.f, 'guerre').ok, true);
  assert.equal(M.relation(e, voisin.f), 'guerre');
  // Une IA en paix n'attaque jamais le joueur.
  const e2 = M.nouvellePartie('rois', 'france', 3);
  e2.diplo.forEach((d) => { if (d) { d.rel = 'paix'; d.att = 90; } });
  for (let t = 0; t < 10; t++) {
    const def = M.finDuTour(e2);
    assert.equal(def.length, 0);
    e2.diplo.forEach((d) => { if (d) { d.rel = d.rel === 'guerre' ? 'paix' : d.rel; d.att = 90; } });
  }
});
