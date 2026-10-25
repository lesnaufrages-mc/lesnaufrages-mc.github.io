// Même calendrier que le jeu (src/game.js) : le mot n°1 est sorti le 25 octobre 2026.
// Le bot ne connaît que le numéro du jour, jamais le mot : pas de risque de spoiler.
const LAUNCH_DAY = Date.UTC(2026, 9, 25);
export const MAX_TRIES = 6;

// Date du jour à Paris, pour que le numéro change à minuit en France.
export function dateParis(date = new Date()) {
  const [a, m, j] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' })
    .format(date).split('-').map(Number);
  return { annee: a, mois: m, jour: j };
}

export function heureParis(date = new Date()) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: 'numeric', hourCycle: 'h23' }).format(date));
}

export function dayNumber(date = new Date()) {
  const { annee, mois, jour } = dateParis(date);
  return Math.floor((Date.UTC(annee, mois - 1, jour) - LAUNCH_DAY) / 86400000) + 1;
}

// Lit un résultat collé depuis le jeu : "Mot Mystère #3 4/6 ..." -> { day: 3, tries: 4 }.
// tries = null si le joueur a perdu (X/6).
export function parseScore(text) {
  const m = /Mot Myst[eè]re #(\d+) ([1-6X])\/6/i.exec(text);
  if (!m) return null;
  return { day: Number(m[1]), tries: m[2].toUpperCase() === 'X' ? null : Number(m[2]) };
}

// Trouvé en 1 essai = 6 points ... en 6 essais = 1 point, raté = 0.
export function points(tries) {
  return tries ? MAX_TRIES + 1 - tries : 0;
}
