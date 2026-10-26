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

import { GRADES, POSTES, estPoste, ouvrirCandidature, fermerCandidature } from '../src/staff.js';
import { commandes } from '../src/commandes.js';

test('grades du staff : mêmes noms que le site', () => {
  assert.deepEqual(GRADES.map((g) => g.nom), ['Fondateur', 'Admin', 'Responsable', 'Modo', 'Helper', 'Builder', 'Dev', 'Animateur']);
  assert.deepEqual(POSTES.map((g) => g.nom), ['Modo', 'Helper', 'Builder', 'Dev', 'Animateur']);
  assert.equal(estPoste('Modo'), true);
  assert.equal(estPoste('Fondateur'), false); // on ne postule pas pour être fondateur
});

test('une seule candidature en attente par personne', () => {
  const data = {};
  const rien = () => {};
  assert.equal(ouvrirCandidature('u1', 'Modo', data, rien), true);
  assert.equal(ouvrirCandidature('u1', 'Helper', data, rien), false);
  fermerCandidature('u1', data, rien);
  assert.equal(ouvrirCandidature('u1', 'Helper', data, rien), true);
});

test('commandes "/" valides', () => {
  const noms = commandes.map((c) => c.name);
  for (const n of ['staff', 'candidature', 'staff-setup', 'recrutement']) assert.ok(noms.includes(n));
  assert.equal(new Set(noms).size, noms.length);
});

test('après 7 jours sans réponse, on peut repostuler', async () => {
  const { enAttente } = await import('../src/staff.js');
  const data = { u1: { poste: 'Modo', date: '2026-10-01T00:00:00Z' } };
  assert.equal(enAttente('u1', data, Date.parse('2026-10-03T00:00:00Z')), true);
  assert.equal(enAttente('u1', data, Date.parse('2026-10-09T00:00:00Z')), false);
});

test('actus du site : lecture, nouveautés et liens sûrs', async () => {
  const { lireActusJs, nouvelles, cle, lienAbsolu, messageActu } = await import('../src/actus.js');
  const code = 'var ACTUALITES = [{ date: "2026-10-26", categorie: "site", titre: "B", texte: "b", lien: "strategie/", video: "videos/t.mp4" }, { date: "2026-10-25", categorie: "appli", titre: "A", texte: "a" }];';
  const actus = lireActusJs(code);
  assert.equal(actus.length, 2);
  assert.deepEqual(nouvelles(actus, null), []); // 1er passage : on n'inonde pas le salon
  assert.deepEqual(nouvelles(actus, [cle(actus[1])]).map((a) => a.titre), ['B']);
  assert.equal(cle({ id: 7, titre: 'x' }), 'sb:7');
  assert.equal(lienAbsolu('strategie/'), 'https://lesnaufrages-mc.github.io/strategie/');
  assert.equal(lienAbsolu('https://discord.gg/x'), 'https://discord.gg/x');
  assert.equal(lienAbsolu('javascript:alert(1)'), null);
  assert.equal(lienAbsolu(' javascript:x'), null);
  const m = messageActu(actus[0]);
  assert.equal(m.embeds[0].toJSON().title, 'B');
  assert.equal(m.components[0].toJSON().components.length, 2);
});
