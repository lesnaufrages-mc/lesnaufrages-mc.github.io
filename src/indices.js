import { MAX_TRIES, WORD_LENGTH, evaluate } from './game.js';

// court = ce qui s'affiche sur le bouton, pour comprendre tout de suite.
// Les aides du naufragé : on peut toutes les ouvrir tout de suite, sans attendre.
// Le niveau choisi décide combien elles coûtent (en essais).
export const INDICES = [
  { id: 'bouteille', emoji: '🍾', nom: 'Bouteille à la mer', court: 'Une phrase', aide: 'une phrase sur le mot' },
  { id: 'longuevue', emoji: '🔭', nom: 'Longue-vue', court: 'Une lettre', aide: 'montre une lettre à sa place' },
  { id: 'boussole', emoji: '🧭', nom: 'Boussole', court: 'Une 2e lettre', aide: 'montre une 2e lettre à sa place' },
  { id: 'filet', emoji: '🎣', nom: 'Filet', court: '6 lettres en moins', aide: 'enlève 6 fausses lettres du clavier' },
];

// gratuits = nombre d'indices qui ne coûtent pas d'essai. Les suivants coûtent 1 essai chacun.
export const NIVEAUX = {
  mousse: { emoji: '🐚', nom: 'Mousse', gratuits: Infinity, aide: 'Facile : indices gratuits et phrases plus simples.' },
  matelot: { emoji: '⚓', nom: 'Matelot', gratuits: 1, aide: 'Normal : 1 indice gratuit, puis 1 essai par indice.' },
  capitaine: { emoji: '🏴‍☠️', nom: 'Capitaine', gratuits: 0, aide: 'Difficile : chaque indice coûte 1 essai.' },
};
// On commence en facile, puis le joueur monte quand il veut.
export const NIVEAU_DEFAUT = 'mousse';

export function niveauValide(n) {
  return NIVEAUX[n] ? n : NIVEAU_DEFAUT;
}

// Indices proposés : la bouteille seulement quand il y a une page du journal (sa phrase vient de là).
export function indicesDispo(avecPage) {
  return INDICES.filter((i) => avecPage || i.id !== 'bouteille');
}

// Nombre d'essais perdus pour `nb` indices ouverts.
export function coutIndices(niveau, nb) {
  return Math.max(0, nb - NIVEAUX[niveauValide(niveau)].gratuits);
}

// Un indice payant ne doit jamais prendre le dernier essai.
export function peutOuvrir(niveau, ouverts, nbEssais) {
  return nbEssais + coutIndices(niveau, ouverts.length + 1) < MAX_TRIES;
}

// Position d'une lettre que le joueur n'a pas encore trouvée (de gauche à droite).
export function prochaineLettre(answer, guesses, deja = []) {
  const trouvees = new Set(deja);
  guesses.forEach((g) => evaluate(g, answer).forEach((s, i) => { if (s === 'correct') trouvees.add(i); }));
  for (let i = 0; i < WORD_LENGTH; i++) if (!trouvees.has(i)) return i;
  return null;
}

// Lettres absentes du mot et pas encore essayées, toujours les mêmes pour un mot donné.
export function lettresFilet(answer, guesses, n = 6) {
  const essayees = new Set(guesses.join(''));
  const melange = (l) => [...(l + answer + l)].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 2654435761) >>> 0, 7);
  return [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']
    .filter((l) => !answer.includes(l) && !essayees.has(l))
    .sort((a, b) => melange(a) - melange(b))
    .slice(0, n)
    .sort();
}

// "A · · · E" : les lettres données par la longue-vue et la boussole.
export function motifLettres(answer, positions) {
  return Array.from({ length: WORD_LENGTH }, (_, i) => (positions.includes(i) ? answer[i] : '·')).join(' ');
}
