import test from 'node:test';
import assert from 'node:assert/strict';
import { dayNumber, parseScore, points, heureParis } from '../src/motdujour.js';
import { enregistrer, classement } from '../src/scores.js';

test('numéro du jour : même calendrier que le jeu (heure de Paris)', () => {
  assert.equal(dayNumber(new Date('2026-10-25T12:00:00Z')), 1);
  assert.equal(dayNumber(new Date('2026-10-26T08:00:00Z')), 2);
  // 23h30 UTC le 25 = 00h30 le 26 à Paris
  assert.equal(dayNumber(new Date('2026-10-25T23:30:00Z')), 2);
});

test('heure de Paris', () => {
  assert.equal(heureParis(new Date('2026-10-26T08:00:00Z')), 9); // heure d'hiver UTC+1
});

test('lecture des résultats collés depuis le jeu', () => {
  assert.deepEqual(parseScore('Mot Mystère #3 4/6\n\n🟩🟩⬛'), { day: 3, tries: 4 });
  assert.deepEqual(parseScore('Mot Mystère #12 X/6'), { day: 12, tries: null });
  assert.equal(parseScore('salut tout le monde'), null);
});

test('points et classement', () => {
  assert.equal(points(1), 6);
  assert.equal(points(6), 1);
  assert.equal(points(null), 0);
  const data = {};
  const rien = () => {};
  assert.equal(enregistrer('a', 'Alice', 1, 2, data, rien), true);
  assert.equal(enregistrer('a', 'Alice', 1, 1, data, rien), false); // un seul score par jour
  enregistrer('b', 'Bob', 1, null, data, rien);
  enregistrer('b', 'Bob', 2, 1, data, rien);
  assert.deepEqual(classement(data).map((j) => [j.nom, j.points]), [['Alice', 5], ['Bob', 6]].reverse());
});
