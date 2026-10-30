import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, normalize, wordOfTheDay, dayNumber, shareText, keyboardStates } from '../src/game.js';
import { WORDS } from '../src/words.js';
import { PAGES, pageDuJour } from '../src/journal.js';
import {
  coutIndices, indicesDispo, lettresFilet, motifLettres, peutOuvrir, prochaineLettre,
} from '../src/indices.js';

test('bonne réponse', () => assert.deepEqual(evaluate('ARBRE', 'ARBRE'), Array(5).fill('correct')));
test('lettres en double', () => {
  // réponse ARBRE a deux R : un bien placé (pos 3), un à trouver ailleurs
  assert.deepEqual(evaluate('RRRRR', 'ARBRE'), ['absent', 'correct', 'absent', 'correct', 'absent']);
  assert.deepEqual(evaluate('ERREE', 'ARBRE'), ['absent', 'correct', 'present', 'absent', 'correct']);
});
test('normalize enlève les accents', () => assert.equal(normalize('Étoilé!'), 'ETOILE'));
test('mot du jour stable et valide', () => {
  const d = new Date(2026, 9, 25);
  assert.equal(dayNumber(d), 1);
  assert.equal(wordOfTheDay(d), PAGES[0].mot);
  assert.equal(wordOfTheDay(new Date(2026, 9, 24)), WORDS[WORDS.length - 1]);
});
test('tous les mots ont 5 lettres A-Z', () => WORDS.forEach((w) => assert.match(w, /^[A-Z]{5}$/)));
test('texte de partage', () => {
  const t = shareText([evaluate('PLAGE', 'ARBRE'), evaluate('ARBRE', 'ARBRE')], true, 3);
  assert.ok(t.startsWith('Mot Mystère #3 2/6'));
  assert.ok(t.includes('🟩🟩🟩🟩🟩'));
  assert.ok(t.includes('🟦'));
});
test('clavier garde le meilleur état', () => {
  const k = keyboardStates(['RRRRR', 'ARBRE'], 'ARBRE');
  assert.equal(k.R, 'correct');
  assert.equal(k.A, 'correct');
});
test('journal : un mot de 5 lettres A-Z et un indice par page', () => {
  assert.equal(PAGES.length, 30);
  PAGES.forEach((p) => {
    assert.match(p.mot, /^[A-Z]{5}$/);
    assert.ok(p.titre && p.indice && p.texte);
    assert.ok(normalize(p.texte).includes(p.mot), `le mot ${p.mot} apparaît dans sa page`);
  });
});
test('le mot du jour suit le journal puis reprend la liste', () => {
  assert.equal(wordOfTheDay(new Date(2026, 9, 25)), 'ARBRE');
  assert.equal(wordOfTheDay(new Date(2026, 9, 28)), 'CRABE');
  assert.equal(wordOfTheDay(new Date(2026, 10, 23)), 'TERRE'); // page 30
  assert.equal(pageDuJour(31), null);
  assert.match(wordOfTheDay(new Date(2026, 10, 24)), /^[A-Z]{5}$/);
});
test('partage avec bouteille et page : compatible avec le bot', () => {
  const t = shareText([evaluate('PLAGE', 'ARBRE'), evaluate('ARBRE', 'ARBRE')], true, 1,
    { bouteille: true, page: PAGES[0] });
  assert.ok(t.startsWith('Mot Mystère #1 3/6 🍾'));
  assert.ok(t.includes('« Le réveil »'));
  assert.ok(t.includes('🟦'));
  assert.ok(/Mot Myst[eè]re #(\d+) ([1-6X])\/6/i.test(t));
});
test('journal : une phrase facile par page', () => PAGES.forEach((p) => assert.ok(p.facile, p.mot)));
test('indices : le niveau décide du coût', () => {
  assert.equal(coutIndices('mousse', 4), 0);
  assert.equal(coutIndices('matelot', 1), 0);
  assert.equal(coutIndices('matelot', 3), 2);
  assert.equal(coutIndices('capitaine', 2), 2);
  assert.equal(coutIndices('inconnu', 9), 0); // niveau par défaut = mousse (facile)
});
test('indices : tous ouvrables tout de suite, jamais le dernier essai', () => {
  assert.ok(peutOuvrir('capitaine', [], 0));
  assert.ok(peutOuvrir('mousse', ['bouteille', 'longuevue', 'boussole'], 5));
  assert.ok(!peutOuvrir('capitaine', ['bouteille'], 4)); // 4 essais + 2 indices = 6 : plus rien pour jouer
  assert.ok(peutOuvrir('capitaine', ['bouteille'], 3));
  assert.equal(indicesDispo(false).length, 3);
  assert.equal(indicesDispo(true).length, 4);
});
test('indices : lettres et filet', () => {
  assert.equal(prochaineLettre('ARBRE', []), 0);
  assert.equal(prochaineLettre('ARBRE', ['AXXXX'], []), 1);
  assert.equal(prochaineLettre('ARBRE', [], [0]), 1);
  assert.equal(prochaineLettre('ARBRE', ['ARBRE']), null);
  assert.equal(motifLettres('ARBRE', [0, 4]), 'A · · · E');
  const f = lettresFilet('ARBRE', ['PLAGE']);
  assert.equal(f.length, 6);
  f.forEach((l) => { assert.ok(!'ARBRE'.includes(l)); assert.ok(!'PLAGE'.includes(l)); });
  assert.deepEqual(lettresFilet('ARBRE', ['PLAGE']), f); // toujours les mêmes
});
test('partage avec plusieurs indices : compatible avec le bot', () => {
  const t = shareText([evaluate('PLAGE', 'ARBRE'), evaluate('ARBRE', 'ARBRE')], true, 6,
    { page: PAGES[5], essaisIndices: 1, marques: ' 🍾🔭 ⚓' });
  assert.ok(t.startsWith('Mot Mystère #6 3/6 🍾🔭 ⚓'));
  assert.ok(/Mot Myst[eè]re #(\d+) ([1-6X])\/6/i.test(t));
});
