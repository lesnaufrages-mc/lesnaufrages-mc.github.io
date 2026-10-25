import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, normalize, wordOfTheDay, dayNumber, shareText, keyboardStates } from '../src/game.js';
import { WORDS } from '../src/words.js';

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
  assert.equal(wordOfTheDay(d), WORDS[0]);
  assert.equal(wordOfTheDay(new Date(2026, 9, 24)), WORDS[WORDS.length - 1]);
});
test('tous les mots ont 5 lettres A-Z', () => WORDS.forEach((w) => assert.match(w, /^[A-Z]{5}$/)));
test('texte de partage', () => {
  const t = shareText([evaluate('PLAGE', 'ARBRE'), evaluate('ARBRE', 'ARBRE')], true, 3);
  assert.ok(t.startsWith('Mot Mystère #3 2/6'));
  assert.ok(t.includes('🟩🟩🟩🟩🟩'));
});
test('clavier garde le meilleur état', () => {
  const k = keyboardStates(['RRRRR', 'ARBRE'], 'ARBRE');
  assert.equal(k.R, 'correct');
  assert.equal(k.A, 'correct');
});
