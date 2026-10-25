import { WORDS } from './words.js';

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
export function wordOfTheDay(date = new Date()) {
  const n = dayNumber(date);
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

const EMOJI = { correct: '🟩', present: '🟨', absent: '⬛' };

export function shareText(rows, won, day) {
  const score = won ? `${rows.length}/${MAX_TRIES}` : `X/${MAX_TRIES}`;
  const grid = rows.map((r) => r.map((s) => EMOJI[s]).join('')).join('\n');
  return `Mot Mystère #${day} ${score}\n\n${grid}\n\nTu fais mieux ? 👉 lesnaufrages-mc.github.io/jouer/`;
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
