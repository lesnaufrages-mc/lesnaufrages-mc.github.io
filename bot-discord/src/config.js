import fs from 'node:fs';

// Tous les réglages viennent du fichier .env (jamais du code : le dépôt est public).
// On le charge nous-mêmes pour que "node src/index.js" marche aussi chez un hébergeur.
// (Lecture faite à la main : tolère le BOM, les fins de ligne Windows et les fichiers UTF-16 du Bloc-notes.)
function chargerEnv(fichier = '.env') {
  if (!fs.existsSync(fichier) || !fs.statSync(fichier).isFile()) return;
  const brut = fs.readFileSync(fichier);
  const texte = brut[0] === 0xff && brut[1] === 0xfe ? brut.toString('utf16le') : brut.toString('utf8');
  for (const ligne of texte.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/i.exec(ligne);
    if (!m || ligne.trim().startsWith('#')) continue;
    const valeur = m[2].replace(/^(['"])(.*)\1$/, '$2');
    if (valeur && !process.env[m[1]]) process.env[m[1]] = valeur;
  }
}
chargerEnv();
const env = process.env;

export const config = {
  token: env.DISCORD_TOKEN?.trim(),
  guildId: env.GUILD_ID,
  salonBienvenue: env.SALON_BIENVENUE_ID || null,
  salonMotDuJour: env.SALON_MOT_DU_JOUR_ID || null,
  salonActus: env.SALON_ACTUS_ID || null,
  roleArrivant: env.ROLE_ARRIVANT_ID || null,
  roleNotif: env.ROLE_NOTIF_ID || null,
  rappelHeure: Number(env.RAPPEL_HEURE ?? 9),
};

export const LIEN_JEU = 'https://lesnaufrages-mc.github.io/jouer/';
export const LIEN_DISCORD = 'https://discord.gg/Xdkzj8bZnk';

export function verifierConfig() {
  const manque = ['token', 'guildId'].filter((cle) => !config[cle]);
  if (manque.length) {
    console.error('❌ Il manque DISCORD_TOKEN ou GUILD_ID dans le fichier .env (voir .env.example).');
    process.exit(1);
  }
}
