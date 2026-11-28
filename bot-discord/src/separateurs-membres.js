import { CATEGORIES, categorie } from './rangement.js';

// Rôles séparateurs donnés aux membres du staff selon leur grade :
// un grade du haut staff => « ━━ 👑 HAUT STAFF ━━ », un grade de l'équipe staff => « ━━ 🛡️ ÉQUIPE STAFF ━━ ».
// Retirés si la personne n'a plus aucun grade de la catégorie. Au démarrage, toutes les 6 h et à chaque changement de rôles.
const CLES = ['direction', 'staff', 'boutique']; // boutique : « ━━ ⚓ BOUTIQUE SOUTIEN ━━ » pour Matelot / Corsaire / Amiral

// Pure, testée : roles = [{ id, name, managed }], separateurs = { cle: id } => { ajouter: [], retirer: [] }
export function separateursVoulus(roles, separateurs) {
  const idsSep = new Set(Object.values(separateurs));
  const cles = new Set(roles.filter((r) => !idsSep.has(r.id) && !r.managed).map((r) => categorie(r, null)));
  const aRole = new Set(roles.map((r) => r.id));
  const ajouter = []; const retirer = [];
  for (const cle of CLES) {
    const id = separateurs[cle]; if (!id) continue;
    if (cles.has(cle) && !aRole.has(id)) ajouter.push(id);
    if (!cles.has(cle) && aRole.has(id)) retirer.push(id);
  }
  return { ajouter, retirer };
}

const sepsDu = (guild) => Object.fromEntries(CATEGORIES.filter((c) => CLES.includes(c.cle)).map((c) => [c.cle, guild.roles.cache.find((r) => r.name === c.nom)?.id]).filter(([, id]) => id));

async function appliquer(membre, seps) {
  if (membre.user.bot) return 0;
  const { ajouter, retirer } = separateursVoulus([...membre.roles.cache.values()].filter((r) => r.id !== membre.guild.id), seps);
  if (ajouter.length) await membre.roles.add(ajouter, 'Séparateur selon le grade').catch(() => {});
  if (retirer.length) await membre.roles.remove(retirer, 'Plus de grade dans cette catégorie').catch(() => {});
  return ajouter.length + retirer.length;
}

export async function donnerSeparateurs(guild) {
  const seps = sepsDu(guild); if (!Object.keys(seps).length) return;
  const membres = await guild.members.fetch();
  let n = 0; for (const m of membres.values()) n += await appliquer(m, seps);
  console.log(`Séparateurs (staff, boutique) : ${n} changement(s)`);
}

export function surveillerSeparateurs(client, guild) {
  client.on('guildMemberUpdate', (avant, apres) => {
    if (apres.guild.id !== guild.id || avant.roles.cache.size === apres.roles.cache.size && avant.roles.cache.every((_, id) => apres.roles.cache.has(id))) return;
    appliquer(apres, sepsDu(guild)).catch(() => {});
  });
}
