import { trouverRole } from './roles.js';

// Rôle « Bot » pour tous les bots du serveur (ceux déjà présents, au démarrage puis toutes les heures),
// et retrait de « Non-vérifié » / « Membre » s'ils l'ont reçu par erreur.
// Les nouveaux bots reçoivent déjà le rôle à leur arrivée (arriveeRoles dans roles.js).
export async function rangerBots(guild) {
  const roles = await guild.roles.fetch();
  const bot = trouverRole(roles, 'Bot');
  if (!bot) { console.error('Rôle Bot introuvable (/roles-setup)'); return 0; }
  const enTrop = ['Non-vérifié', 'Membre'].map((n) => trouverRole(roles, n)).filter(Boolean);
  const membres = await guild.members.fetch();
  let n = 0;
  for (const m of membres.filter((x) => x.user.bot).values()) {
    if (!m.roles.cache.has(bot.id) && await m.roles.add(bot, 'Rôle des bots').then(() => true).catch(() => false)) n++;
    for (const r of enTrop) if (m.roles.cache.has(r.id)) await m.roles.remove(r, 'Un bot n\'a pas besoin de ce rôle').catch(() => {});
  }
  if (n) console.log(`Bots : rôle Bot donné à ${n} bot(s)`);
  return n;
}
