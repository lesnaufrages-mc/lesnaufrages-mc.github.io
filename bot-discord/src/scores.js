import fs from 'node:fs';
import path from 'node:path';
import { points } from './motdujour.js';

// Les scores sont gardés dans data/scores.json (créé tout seul, jamais envoyé sur GitHub).
const FICHIER = path.resolve('data', 'scores.json');

function lire() {
  try {
    return JSON.parse(fs.readFileSync(FICHIER, 'utf8'));
  } catch {
    return {};
  }
}

function ecrire(data) {
  fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
  fs.writeFileSync(FICHIER, JSON.stringify(data, null, 2));
}

// Un seul score par joueur et par jour : renvoie false si déjà enregistré.
export function enregistrer(userId, nom, day, tries, data = lire(), sauver = ecrire) {
  const joueur = (data[userId] ??= { nom, jours: {} });
  joueur.nom = nom;
  if (joueur.jours[day] !== undefined) return false;
  joueur.jours[day] = tries;
  sauver(data);
  return true;
}

export function classement(data = lire(), limite = 10) {
  return Object.values(data)
    .map((j) => {
      const essais = Object.values(j.jours);
      return {
        nom: j.nom,
        points: essais.reduce((s, t) => s + points(t), 0),
        parties: essais.length,
        victoires: essais.filter((t) => t).length,
      };
    })
    .sort((a, b) => b.points - a.points || b.victoires - a.victoires)
    .slice(0, limite);
}
