import { WORDS } from './words.js';
import { pageDuJour } from './journal.js';

export const WORD_LENGTH = 5;
export const MAX_TRIES = 6;
const LAUNCH_DAY = Date.UTC(2026, 9, 25); // jour n°1

// "Été" -> "ETE" : on joue sans accents.
export function normalize(text) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z]/g, '');
}

export function dayNumber(date = new Date()) {
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((today - LAUNCH_DAY) / 86400000) + 1;
}

// Tout le monde a le même mot le même jour : c'est ce qui rend le partage viral.
// Pendant une saison du journal, le mot du jour est celui de la page de l'histoire.
export function wordOfTheDay(date = new Date()) {
  const n = dayNumber(date);
  const page = pageDuJour(n);
  if (page) return page.mot;
  return WORDS[(((n - 1) % WORDS.length) + WORDS.length) % WORDS.length];
}

export function randomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

// 'correct' = bonne place, 'present' = dans le mot ailleurs, 'absent' = pas dans le mot.
// Gère les lettres en double comme Wordle.
export function evaluate(guess, answer) {
  const result = Array(WORD_LENGTH).fill('absent');
  const left = {};
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (guess[i] === answer[i]) result[i] = 'correct';
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < WORD_LENGTH; i++) {
    if (result[i] !== 'correct' && left[guess[i]] > 0) {
      result[i] = 'present';
      left[guess[i]]--;
    }
  }
  return result;
}

// Bleu = la mer : notre grille ne ressemble pas à celle des autres jeux.
const EMOJI = { correct: '🟩', present: '🟨', absent: '🟦' };

// essaisIndices = essais perdus en ouvrant des indices (ils comptent dans le score).
// marques = emojis des indices ouverts et du niveau, ex. " 🍾🔭 ⚓".
// bouteille = ancien format (un seul indice qui coûtait un essai).
// Garde le début « Mot Mystère #N X/6 » : le bot Discord le lit pour le classement.
export function shareText(rows, won, day, { bouteille = false, page = null, essaisIndices, marques } = {}) {
  const used = rows.length + (essaisIndices ?? (bouteille ? 1 : 0));
  const score = won ? `${used}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
  const grid = rows.map((r) => r.map((s) => EMOJI[s]).join('')).join('\n');
  const titre = page ? `\n📖 Journal du naufragé, page ${day} : « ${page.titre} »` : '';
  const indice = marques ?? (bouteille ? ' 🍾' : '');
  return `Mot Mystère #${day} ${score}${indice}${titre}\n\n${grid}\n\nTu fais mieux ? 👉 lesnaufrages-mc.github.io/jouer/`;
}

// Meilleur état connu de chaque lettre, pour colorer le clavier.
export function keyboardStates(guesses, answer) {
  const rank = { absent: 1, present: 2, correct: 3 };
  const states = {};
  for (const g of guesses) {
    evaluate(g, answer).forEach((s, i) => {
      if (!states[g[i]] || rank[s] > rank[states[g[i]]]) states[g[i]] = s;
    });
  }
  return states;
}
