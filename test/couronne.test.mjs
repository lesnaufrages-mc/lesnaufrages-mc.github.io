import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const M = require('../docs/strategie/moteur.js');
const CR = require('../docs/strategie/couronne.js');
const D = require('../docs/strategie/couronne-donnees.js');

const jouer = (e, tours) => {
  for (let t = 0; t < tours && !e.fin; t++) {
    M.finDuTour(e);
    let k = 0;
    while ((e.evenements || []).length && k++ < 10) M.choisirEvenement(e, t % 2);
  }
};

test('les campagnes Couronne citent des provinces existantes, une fois, avec leurs souverains', () => {
  const ids = M.PROV.map((p) => p.id);
  D.EPOQUES.forEach((e) => {
    assert.ok(M.epoque(e.id), e.id);
    const vu = new Set();
    e.factions.forEach((f) => {
      assert.ok(D.PERSONNAGES[e.id][f[0]], e.id + ' : souverain de ' + f[0]);
      f[3].forEach((p) => {
        assert.ok(ids.includes(p), e.id + ' : ' + p);
        assert.ok(!vu.has(p), e.id + ' : ' + p + ' en double');
        vu.add(p);
      });
    });
  });
  D.QUETES.forEach((q) => q.provinces.forEach((p) => assert.ok(ids.includes(p), q.id + ' : ' + p)));
  Object.values(D.RELIGIONS).forEach((r) => r.lieux.forEach((p) => assert.ok(ids.includes(p), p)));
});

test('une partie gratuite ne change pas', () => {
  const e = M.nouvellePartie('charlemagne', 'francs', 42);
  assert.equal(e.couronne, undefined);
  assert.equal(e.cou, undefined);
  assert.ok(e.factions.every((F) => F.foi === undefined));
  assert.ok(M.quetes(e, e.joueur).every((x) => !x.q.couronne));
  const g = M.nouvellePartie('croisades', 'france', 42);
  assert.ok(!M.quetes(g, g.joueur).some((x) => x.q.id === 'outremer'));
  jouer(e, 10);
  assert.equal(e.cou, undefined);
  assert.ok(M.detailOrdre(e, e.factions[e.joueur].capitale).every((d) => !/religion|Hérésie|Caractère/.test(d[0])));
});

test('une partie Couronne : religions, traits, piété et renommée', () => {
  for (const [ep, f] of [['vikings', 'vikings'], ['centans', 'angleterre'], ['charlesquint', 'espagne'], ['croisades', 'france']]) {
    const e = M.nouvellePartie(ep, f, 7, { couronne: true });
    assert.ok(e.couronne && e.cou, ep);
    assert.ok(e.factions.every((F) => CR.RELIGIONS[F.foi]), ep + ' : chaque royaume a une foi');
    assert.ok(e.provinces.every((p) => CR.RELIGIONS[p.foi]), ep + ' : chaque province a une foi');
    assert.ok(CR.traits(e.factions[e.joueur].roi).length >= 2);
    const piete = e.cou.piete;
    jouer(e, 25);
    assert.ok(e.cou.piete > piete || e.fin, ep + ' : la piété monte');
  }
  const v = M.nouvellePartie('vikings', 'vikings', 3, { couronne: true });
  assert.equal(v.factions[v.joueur].foi, 'paien');
  assert.deepEqual(CR.traits(v.factions[v.joueur].roi), ['ruse', 'cruel', 'maladif']);
  assert.ok(M.quetes(v, v.joueur).some((x) => x.q.id === 'danelaw'));
});

test('guerre sainte, intrigues, héritages', () => {
  const e = M.nouvellePartie('vikings', 'wessex', 11, { couronne: true });
  const J = e.factions[e.joueur];
  e.cou.piete = 1000; J.or = 2000; e.cou.renom = 1000;
  const cibles = CR.ciblesGuerreSainte(e);
  assert.ok(cibles.some((x) => e.factions[x.f].id === 'vikings'));
  const vik = e.factions.findIndex((F) => F.id === 'vikings');
  const avant = e.provinces.reduce((s, p) => s + (p.proprio === e.joueur ? p.armee.length : 0), 0);
  assert.ok(CR.guerreSainte(e, vik).ok);
  assert.equal(M.relation(e, vik), 'guerre');
  assert.ok(e.provinces.reduce((s, p) => s + (p.proprio === e.joueur ? p.armee.length : 0), 0) > avant);
  assert.equal(typeof CR.guerreSainte(e, vik), 'string'); // déjà en cours
  // Héritages : 3 niveaux, pas plus.
  ['gouvernance', 'gouvernance', 'gouvernance'].forEach((k) => assert.equal(CR.heritage(e, k), null));
  assert.equal(typeof CR.heritage(e, 'gouvernance'), 'string');
  const rev = M.revenu(e, e.joueur);
  e.cou.her.gouvernance = 0;
  assert.ok(M.revenu(e, e.joueur) < rev);
  // Intrigue d'assassinat : le souverain finit par changer (ou l'intrigue est découverte).
  const roi = e.factions[vik].roi.nom;
  assert.equal(CR.lancerIntrigue(e, 'assassinat', vik), null);
  assert.equal(typeof CR.lancerIntrigue(e, 'assassinat', vik), 'string');
  for (let t = 0; t < 12 && e.cou.intrigues.length; t++) M.finDuTour(e);
  assert.equal(e.cou.intrigues.length, 0);
  assert.ok(e.factions[vik].roi.nom !== roi || e.journal.some((l) => l.includes('découverte')));
});

test('revendication : la province conquise ne se révolte pas', () => {
  const e = M.nouvellePartie('centans', 'france', 5, { couronne: true });
  const i = CR.ciblesIntrigue(e, 'revendication')[0];
  e.cou.revs[i] = true;
  const de = M.PROV[i].voisins.find((v) => e.provinces[v].proprio === e.joueur);
  e.provinces[i].armee = [];
  e.provinces[i].bat.murs = 0;
  if (e.provinces[i].proprio >= 0) M.changerRelation(e, e.provinces[i].proprio, 'guerre');
  const att = M.preparerAttaque(e, de, i, e.provinces[de].armee.map((u, k) => k));
  assert.ok(!att.erreur, att.erreur);
  assert.ok(M.appliquerBataille(e, att, null));
  assert.equal(e.provinces[i].agit, 0);
  assert.ok(!e.cou.revs[i]);
});
