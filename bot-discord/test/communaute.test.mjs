import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetes, prochains, dateValide, porteLeTag, estGradeStaff } from '../src/communaute.js';
import { premierTour, tourSuivant, valider, matchDe, nomTour } from '../src/tournois.js';

test('anniversaires', () => {
  const l = { a: { j: 20, m: 11 }, b: { j: 29, m: 2 }, c: { j: 1, m: 1 } };
  assert.deepEqual(fetes(l, { j: 20, m: 11, a: 2026 }), ['a']);
  assert.deepEqual(fetes(l, { j: 28, m: 2, a: 2026 }), ['b']);
  assert.deepEqual(fetes(l, { j: 28, m: 2, a: 2028 }), []);
  assert.deepEqual(prochains(l, { j: 21, m: 11 }).map((x) => x.id), ['c', 'b', 'a']);
  assert.ok(dateValide(29, 2) && !dateValide(31, 4));
});

test('tag du serveur et grades', () => {
  assert.ok(porteLeTag({ primaryGuild: { identityGuildId: 'G', identityEnabled: true } }, 'G'));
  assert.ok(!porteLeTag({ primaryGuild: { identityGuildId: 'X', identityEnabled: true } }, 'G'));
  assert.ok(!porteLeTag({ primaryGuild: null }, 'G'));
  assert.ok(estGradeStaff({ name: '☄️・Modérateur', managed: false }));
  assert.ok(!estGradeStaff({ name: '🍸・Membre', managed: false }));
});

test('tournoi à 5 joueurs jusqu\'au champion', () => {
  const t = { tours: [premierTour(['1', '2', '3', '4', '5'])], statut: 'en_cours' };
  assert.equal(t.tours[0].length, 4);
  assert.equal(t.tours[0].filter((m) => m.score === 'exempt').length, 3);
  assert.equal(nomTour(4), 'Quarts de finale');
  let tours = 0;
  while (t.statut !== 'fini' && tours++ < 10) {
    const r = t.tours.length - 1;
    const k = t.tours[r].findIndex((m) => !m.gagnant);
    valider(t, r, k, t.tours[r][k].a, '2-0');
  }
  assert.equal(t.statut, 'fini');
  assert.ok(t.champion);
  assert.equal(matchDe(t, t.champion), null);
});

test('tour suivant attend tous les résultats', () => {
  assert.equal(tourSuivant([{ a: '1', b: '2', gagnant: '1' }, { a: '3', b: '4', gagnant: null }]), null);
});
