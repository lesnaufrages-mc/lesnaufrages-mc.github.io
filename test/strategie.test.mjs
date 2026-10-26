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

test('chaque royaume a son souverain historique', () => {
  const P = require('../docs/strategie/personnages.js');
  H.EPOQUES.forEach((e) => e.factions.forEach((f) => {
    const d = P.EPOQUES[e.id][f[0]];
    assert.ok(d, e.id + ' : ' + f[0]);
    assert.ok(d.roi[1] < e.annee && e.annee - d.roi[1] < 95, d.roi[0]);
    assert.ok(P.NOMS[d.c], d.c);
  }));
  const e = M.nouvellePartie('rois', 'france', 1);
  const F = e.factions[e.joueur];
  assert.equal(F.roi.nom, 'Louis XIV');
  assert.equal(M.heritier(F).nom, 'Louis, le Grand Dauphin');
});

test('succession, mariage et union des couronnes', () => {
  const e = M.nouvellePartie('croisades', 'castille', 5);
  const J = e.factions[e.joueur];
  const f = e.factions.findIndex((F) => F.id === 'portugal');
  const P = e.factions[f];
  // Le mariage demande une bonne entente.
  e.diplo[f].att = -20;
  const blanche = J.cour.fam.findIndex((m) => m.nom === 'Blanche de Castille');
  const alphonse = P.cour.fam.findIndex((m) => m.nom === 'Alphonse');
  assert.equal(M.proposer(e, f, 'mariage', { a: blanche, b: alphonse }).ok, false);
  e.tour++;
  e.diplo[f].att = 80;
  const r = M.proposer(e, f, 'mariage', { a: blanche, b: alphonse });
  assert.ok(r.ok, r.msg);
  assert.ok(e.diplo[f].sang);
  // Deux personnes du même sexe ou déjà mariées : refus.
  assert.ok(M.verifMariage(e, f, blanche, alphonse));
  // Le roi de Portugal meurt : son héritier, marié à une Castillane, apporte le royaume.
  const avant = M.nbProvinces(e, e.joueur);
  P.roi.ne = e.annee - 200; P.roi.fragile = true;
  for (let t = 0; t < 6 && M.nbProvinces(e, f) > 0; t++) M.finDuTour(e);
  assert.equal(M.nbProvinces(e, f), 0);
  assert.ok(M.nbProvinces(e, e.joueur) > avant);
  // Un pape mort laisse la place à un pape élu.
  const e2 = M.nouvellePartie('conquete', 'france', 3);
  const pape = e2.factions.find((F) => F.id === 'papaute');
  pape.roi.ne = e2.annee - 200; pape.roi.fragile = true;
  M.finDuTour(e2);
  assert.notEqual(pape.roi.nom, 'Alexandre II');
});

test('impôts, ordre public, entretien et révoltes', () => {
  const e = M.nouvellePartie('rois', 'france', 2);
  const cap = e.factions[e.joueur].capitale;
  const p = e.provinces[cap];
  const normal = M.revenuProvince(p);
  assert.equal(M.changerImpots(e, cap, 2), null);
  assert.ok(M.revenuProvince(p) > normal);
  assert.ok(M.cibleOrdre(e, cap) < 100);
  assert.ok(M.entretien(e, e.joueur) > 0);
  // Une province pressurée, sans garnison, finit par se révolter.
  const autre = e.provinces.findIndex((q, i) => q.proprio === e.joueur && i !== cap);
  const q = e.provinces[autre];
  q.armee = []; q.impots = 2; q.ordre = 0; q.agit = 60;
  let revolte = false;
  for (let t = 0; t < 10 && !revolte; t++) { M.finDuTour(e); revolte = q.proprio !== e.joueur; q.ordre = Math.min(q.ordre, 5); q.armee = []; }
  assert.ok(revolte);
});
