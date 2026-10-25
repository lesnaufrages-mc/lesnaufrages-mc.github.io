// Tous les réglages viennent du fichier .env (jamais du code : le dépôt est public).
const env = process.env;

export const config = {
  token: env.DISCORD_TOKEN,
  guildId: env.GUILD_ID,
  salonBienvenue: env.SALON_BIENVENUE_ID || null,
  salonMotDuJour: env.SALON_MOT_DU_JOUR_ID || null,
  roleArrivant: env.ROLE_ARRIVANT_ID || null,
  roleNotif: env.ROLE_NOTIF_ID || null,
  rappelHeure: Number(env.RAPPEL_HEURE ?? 9),
};

export const LIEN_JEU = 'https://lordmattstark.github.io/projet-mobille-viral-2-mot-mystere-./jouer/';
export const LIEN_DISCORD = 'https://discord.gg/Xdkzj8bZnk';

export function verifierConfig() {
  const manque = ['token', 'guildId'].filter((cle) => !config[cle]);
  if (manque.length) {
    console.error('❌ Il manque DISCORD_TOKEN ou GUILD_ID dans le fichier .env (voir .env.example).');
    process.exit(1);
  }
}
