import fs from 'node:fs';
import path from 'node:path';
import { MessageFlags } from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { trouverRole, CATEGORIES, menu } from './roles.js';

// Grades du serveur Minecraft (groupes LuckPerms) qui doivent exister en rôle Discord,
// pour que DiscordSRV donne les bons rôles aux joueurs qui ont lié leur compte (/discord link en jeu).
// Le bot crée au démarrage ceux qui manquent (sans aucune permission) et écrit la correspondance
// groupe -> identifiant du rôle dans data/grades-mc.json (à recopier dans DiscordSRV/synchronization.yml).
// Les 7 grades staff déjà reliés (fondateur, admin, responsable, modo, helper, dev, animateur) ne sont pas ici.
export const GRADES_MC = [
  // Staff
  { groupe: 'supermodo', nom: 'Super-Modo', couleur: 0xe67e22, existant: '858252530214371329' }, // 🧪・Super Modo
  { groupe: 'modojoueur', nom: 'Modo-Joueur', couleur: 0xf39c12 },
  { groupe: 'cm', nom: 'CM', couleur: 0xe84393 },
  { groupe: 'gamedesigner', nom: 'Game-Designer', couleur: 0x6c5ce7 },
  { groupe: 'builder', nom: 'Builder', couleur: 0xd35400 },
  { groupe: 'terraformeur', nom: 'Terraformeur', couleur: 0x27ae60 },
  { groupe: 'redacteur', nom: 'Rédacteur', couleur: 0x0984e3 },
  // Grades spéciaux
  // Grades achetés sur la boutique (Tebex, lesnaufrages.net/soutien/) : couleurs des préfixes en jeu.
  // Amiral créé en premier pour qu'il soit rangé au-dessus. Anciens rôles 💎・Vip, VIP+ et Mécène laissés tels quels.
  { groupe: 'mecene', nom: '👑・Amiral', couleur: 0xff55ff, hoist: true },
  { groupe: 'vipplus', nom: '🏴‍☠️・Corsaire', couleur: 0xffaa00, hoist: true },
  { groupe: 'vip', nom: '⚓・Matelot', couleur: 0x55ffff, hoist: true },
  { groupe: 'booster', nom: 'Booster MC', couleur: 0xff73fa },
  { groupe: 'sponsor', nom: 'Sponsor', couleur: 0x00cec9 },
  { groupe: 'ambassadeur', nom: 'Ambassadeur', couleur: 0x74b9ff },
  { groupe: 'createur', nom: 'Créateur', couleur: 0xff7675 },
  { groupe: 'partenaire', nom: 'Partenaire', couleur: 0x55efc4, existant: '889589502484549662' }, // 🥂 partenaires
  { groupe: 'betatesteur', nom: 'Bêta-testeur', couleur: 0x81ecec },
  { groupe: 'gagnant', nom: 'Champion', couleur: 0xffd700 },
  // Progression en jeu (préfixe MC pour ne pas confondre avec 🍸・Membre et les niveaux Discord)
  { groupe: 'membre', nom: 'MC・Membre', couleur: 0xb2bec3 },
  { groupe: 'habitue', nom: 'MC・Habitué', couleur: 0x00b894 },
  { groupe: 'veteran', nom: 'MC・Vétéran', couleur: 0x0097e6 },
  { groupe: 'elite', nom: 'MC・Élite', couleur: 0x8e44ad },
  { groupe: 'legende', nom: 'MC・Légende', couleur: 0xc0392b },
];
// Donné par DiscordSRV à tous les comptes liés (MinecraftDiscordAccountLinkedRoleNameToAddUserTo).
export const ROLE_LIE = { nom: 'Compte lié', couleur: 0x2ecc71 };

const FICHIER = path.resolve('data', 'grades-mc.json');

// Rangement : chaque groupe de rôles est placé juste au-dessus (avant) ou juste en dessous (apres) d'un rôle repère.
// Ordre de haut en bas, comme dans Paramètres > Rôles.
export const RANGEMENT = [
  { apres: '828255096851660861', noms: ['Modo-Joueur'] }, // sous ☄️・Modérateur
  { apres: '828255099352121374', noms: ['Game-Designer', 'Builder', 'Terraformeur', 'Rédacteur'] }, // sous 📗・Helpeur
  { avant: '828255103026724875', noms: ['Créateur', 'Ambassadeur', 'Sponsor', 'Mécène', 'VIP+'] }, // au-dessus de 💎・Vip
  { avant: '828255103026724875', noms: ['🎂・Anniversaire', '👑・Légende des Naufragés', '🌟・Ambassadeur', '📨・Recruteur', '🏷️・Supporter'] }, // récompenses communauté, au-dessus de 💎・Vip
  { apres: '889589725843836948', noms: ['🔔・Rappel Bump', '🔔・Rappel vote'] }, // avec les notifications
  { apres: '828255103026724875', noms: ['Booster MC', 'Bêta-testeur', 'Champion'] }, // sous 💎・Vip
  { avant: '828255110639255569', noms: ['MC・Légende', 'MC・Élite', 'MC・Vétéran', 'MC・Habitué', 'MC・Membre', 'Compte lié'] }, // au-dessus de 🔥・Actif
];
// Anciens rôles Discord équivalents : leurs membres reçoivent aussi le nouveau rôle (ajout seulement, jamais de retrait).
export const COPIES = [
  { source: '855826449892900905', cible: 'Booster MC' }, // 🔮・Booster
  { source: '828255105261371394', cible: 'Mécène' }, // 💲・Donateurs
  { source: '883693681046061077', cible: 'Créateur' }, // youtubeur / streamer
];
export const ROLE_LIAISON = '1571489286426071052'; // Naufragés Liaison (DiscordSRV) : juste sous le bot

// Calcule le nouvel ordre (de haut en bas) des rôles. Fonction pure, testée.
export function nouvelOrdre(ordre, rangement = RANGEMENT, nomVersId = {}) {
  const deplaces = new Set(rangement.flatMap((b) => b.noms.map((n) => nomVersId[n])).filter(Boolean));
  let liste = ordre.filter((id) => !deplaces.has(id));
  for (const b of rangement) {
    const ids = b.noms.map((n) => nomVersId[n]).filter(Boolean);
    const k = liste.indexOf(b.avant ?? b.apres);
    if (k < 0) { liste = [...liste, ...ids]; continue; }
    const pos = b.avant ? k : k + 1;
    liste = [...liste.slice(0, pos), ...ids, ...liste.slice(pos)];
  }
  return liste;
}

export async function rangerRoles(guild) {
  await guild.roles.fetch();
  const moi = guild.members.me ?? await guild.members.fetchMe();
  const plafond = moi.roles.highest;
  const tous = [...guild.roles.cache.values()].filter((r) => r.id !== guild.id).sort((a, b) => b.position - a.position || a.id.localeCompare(b.id));
  const nomVersId = Object.fromEntries(tous.map((r) => [r.name, r.id]));
  const reperes = [].map((b) => guild.roles.cache.get(b.avant ?? b.apres)).filter(Boolean);
  const tropHaut = reperes.filter((r) => r.position >= plafond.position);
  if (tropHaut.length) {
    return { ok: false, message: `le rôle « ${plafond.name} » doit être glissé au-dessus de : ${[...new Set(tropHaut.map((r) => r.name))].join(', ')}` };
  }
  // Déplacements un par un (Discord refuse parfois un réordonnancement complet).
  const erreurs = [];
  let bouges = 0;
  const pos = (id) => guild.roles.cache.get(id)?.position ?? -1;
  const deplacer = async (id, cible) => {
    const role = guild.roles.cache.get(id);
    if (!role || role.position === cible) return;
    try { await role.setPosition(cible, { reason: 'Rangement des grades Minecraft' }); bouges++; } catch (e) { erreurs.push(`${role.name} : ${e.message}`); }
    await guild.roles.fetch();
  };
  const liaison = guild.roles.cache.get(ROLE_LIAISON);
  // La liaison est rangée en tête des bots par rangement.js (toujours au-dessus des grades MC).
  void liaison; void deplacer;
  // Rangement par catégories désormais fait par rangement.js (séparateurs) : on ne déplace plus ici que la liaison.
  for (const bloc of []) {
    const ids = bloc.noms.map((n) => nomVersId[n]).filter(Boolean);
    let precedent = bloc.avant ?? bloc.apres;
    let dessus = Boolean(bloc.apres); // le premier va sous le repère ou au-dessus
    for (const id of ids) {
      // Placer « id » juste sous « precedent » (ou juste au-dessus du repère pour le 1er d'un bloc « avant »).
      const ref = pos(precedent);
      if (ref < 0) continue;
      const actuel = pos(id);
      const cible = dessus ? (actuel < ref ? ref - 1 : ref) : (actuel < ref ? ref : ref + 1);
      await deplacer(id, cible);
      precedent = id;
      dessus = true;
    }
  }
  if (erreurs.length) return { ok: false, message: `${bouges} déplacés, erreurs : ${erreurs.slice(0, 5).join(' | ')}` };
  console.log('Grades Minecraft : rôles rangés');
  return { ok: true, message: 'rangés' };
}

// Crée les rôles qui manquent et écrit la correspondance. Renvoie { crees, correspondance }.
export async function creerRolesMinecraft(guild, raison = 'Grades du serveur Minecraft') {
  await guild.roles.fetch();
  const crees = [];
  const correspondance = {};
  for (const g of [...GRADES_MC, { groupe: '_lie', ...ROLE_LIE }]) {
    let role = (g.existant && guild.roles.cache.get(g.existant)) || trouverRole(guild.roles.cache, g.nom);
    if (!role) {
      role = await guild.roles.create({
        name: g.nom, colors: { primaryColor: g.couleur }, hoist: Boolean(g.hoist), mentionable: false, permissions: [], reason: raison,
      });
      crees.push(g.nom);
    }
    correspondance[g.groupe] = { id: role.id, nom: role.name };
  }
  // Rôles des métiers (menu dans #auto-rôle).
  for (const r of CATEGORIES.metier.roles) {
    if (!trouverRole(guild.roles.cache, r.nom)) {
      await guild.roles.create({ name: r.nom, colors: { primaryColor: 0xb7950b }, permissions: [], mentionable: false, reason: 'Métiers du serveur Minecraft' });
      crees.push(r.nom);
    }
  }
  await posterPanneauMetiers(guild).catch((e) => console.error('Panneau métiers :', e.message));
  // Doublons créés avant qu'on relie un grade à un rôle qui existait déjà : supprimés s'ils sont vides.
  for (const g of GRADES_MC.filter((x) => x.existant)) {
    const doublon = [...guild.roles.cache.values()].find((r) => r.name === g.nom && r.id !== g.existant);
    if (doublon && doublon.members.size === 0 && doublon.editable) {
      await doublon.delete('Doublon d\'un rôle existant').then(() => console.log(`Grades Minecraft : doublon « ${g.nom} » supprimé`)).catch(() => {});
    }
  }
  let copies = 0;
  try {
    const membres = await guild.members.fetch();
    for (const c of COPIES) {
      const cible = trouverRole(guild.roles.cache, c.cible);
      if (!cible || !guild.roles.cache.has(c.source)) continue;
      for (const m of membres.values()) {
        if (m.roles.cache.has(c.source) && !m.roles.cache.has(cible.id)) {
          if (await m.roles.add(cible, 'Ancien rôle équivalent').then(() => true).catch(() => false)) copies++;
        }
      }
    }
    if (copies) console.log(`Grades Minecraft : ${copies} rôle(s) donné(s) d'après les anciens rôles`);
  } catch (e) { console.error('Grades Minecraft (anciens rôles) :', e.message); }
  let rangement;
  try { rangement = await rangerRoles(guild); } catch (e) { rangement = { ok: false, message: e.message }; }
  if (!rangement.ok) console.log(`Grades Minecraft (rangement) : ${rangement.message}`);
  fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
  fs.writeFileSync(FICHIER, JSON.stringify({ maj: new Date().toISOString(), crees, copies, correspondance, rangement }, null, 2));
  if (crees.length) console.log(`Grades Minecraft : ${crees.length} rôle(s) créé(s) : ${crees.join(', ')}`);
  return { crees, correspondance };
}

// Menu des métiers posté une seule fois dans #auto-rôle (id du message gardé dans data/panneau-metiers.json).
export const SALON_AUTO_ROLE = '883685703035285526';
const F_PANNEAU = path.resolve('data', 'panneau-metiers.json');
async function posterPanneauMetiers(guild) {
  let deja = null;
  try { deja = JSON.parse(fs.readFileSync(F_PANNEAU, 'utf8')).message; } catch { /* pas encore posté */ }
  if (deja) {
    // Déjà posté : on met le menu à jour (nouveaux métiers) sans reposter.
    const salon = await guild.channels.fetch(SALON_AUTO_ROLE);
    const msg = await salon.messages.fetch(deja).catch(() => null);
    if (msg) {
      const actuel = msg.components?.[0]?.components?.[0]?.options?.length ?? 0;
      if (actuel !== CATEGORIES.metier.roles.length) {
        await msg.edit({ components: [menu('metier')] });
        console.log('Panneau des métiers mis à jour');
      }
      return;
    }
  }
  const salon = await guild.channels.fetch(SALON_AUTO_ROLE);
  const msg = await salon.send({
    embeds: [new EmbedBuilder().setColor(0xb7950b).setTitle('⚒️ Les métiers du serveur Minecraft')
      .setDescription([
        'Affiche sur Discord les métiers que tu exerces en jeu : les autres joueurs sauront à qui s\'adresser pour du minerai, du bois, des potions ou un navire.',
        '',
        '🎮 En jeu : `/jobs browse` pour découvrir les métiers et `/jobs join <métier>` pour en rejoindre un.',
        '📈 Nombre de métiers : 2 au départ, 3 dès le grade Habitué, 4 au grade Légende.',
        '',
        'Choisis tes métiers dans le menu ci-dessous. Pour en retirer un, rouvre le menu et décoche-le.',
      ].join('\n'))
      .setFooter({ text: 'Les Naufragés · naufragesmc.mine.fun' })],
    components: [menu('metier')],
  });
  fs.mkdirSync(path.dirname(F_PANNEAU), { recursive: true });
  fs.writeFileSync(F_PANNEAU, JSON.stringify({ message: msg.id, salon: SALON_AUTO_ROLE }));
  console.log('Panneau des métiers posté dans #auto-rôle');
}

// /roles-minecraft : relance la création à la main et affiche le résultat.
export async function commandeRolesMinecraft(i) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const { crees, correspondance } = await creerRolesMinecraft(i.guild, `/roles-minecraft (${i.user.tag})`);
  let r = {};
  try { r = JSON.parse(fs.readFileSync(FICHIER, 'utf8')).rangement ?? {}; } catch { /* rien */ }
  const lignes = Object.entries(correspondance).map(([g, r]) => `\`${g}\` → <@&${r.id}>`);
  return i.editReply({
    content: [
      crees.length ? `🆕 ${crees.length} rôle(s) créé(s) : ${crees.join(', ')}` : '✔️ Tous les rôles des grades Minecraft existent déjà.',
      r.ok ? `📚 Rangement : ${r.message}` : `⚠️ Rangement impossible : ${r.message}`,
      '',
      ...lignes,
      '',
      'Pense à garder le rôle du bot **et** celui de Naufragés Liaison **au-dessus** de ces rôles (Paramètres > Rôles).',
    ].join('\n'),
    allowedMentions: { roles: [] },
  });
}
