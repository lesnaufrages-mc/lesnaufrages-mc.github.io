import fs from 'node:fs';
import path from 'node:path';
import {
  EmbedBuilder, ChannelType, PermissionFlagsBits, AuditLogEvent, MessageFlags, OverwriteType,
} from 'discord.js';
import { STAFF_DECIDEUR } from './staff.js';

// ============================================================================
// Garde anti-nuke / anti-raid
// 1. Suppressions en masse (salons, rôles), bannissements/expulsions en masse,
//    création de salons en masse : l'auteur perd tous ses rôles puis est banni,
//    et les salons/rôles supprimés sont recréés (noms, sujets, permissions,
//    catégories et ordre conservés ; les anciens messages, eux, sont perdus).
// 2. Webhooks : un webhook créé par quelqu'un qui n'est pas de confiance est
//    supprimé aussitôt, et tout message de webhook qui mentionne @everyone/@here
//    ou envoie une fausse « Nitro gratuite » est effacé.
// Un seul rapport par incident, dans #guard-rapports (créé privé si besoin).
// De confiance : le propriétaire du serveur, le bot lui-même, la liste
// `/guard confiance` (seul le propriétaire peut la changer) et les bots
// présents sur le serveur depuis plus de 7 jours (DiscordSRV…).
// ============================================================================

export const SEUILS = {
  fenetre: 15_000, // ms
  salonsSupprimes: 3,
  rolesSupprimes: 3,
  salonsCrees: 6,
  bans: 3, // bannissements + expulsions
};
const NOM_SALON_RAPPORTS = 'guard-rapports';
const BLEU = 0x3b82f6;
const ROUGE = 0xef4444;
const VERT = 0x22c55e;
const SEPT_JOURS = 7 * 86_400_000;

// --- Réglages : data/guard.json ---
const F_GUARD = path.resolve('data', 'guard.json');
function lireReglages() {
  try { return { actif: true, confiance: [], webhooksOk: [], ...JSON.parse(fs.readFileSync(F_GUARD, 'utf8')) }; } catch { return { actif: true, confiance: [], webhooksOk: [] }; }
}
function ecrireReglages(r) {
  fs.mkdirSync(path.dirname(F_GUARD), { recursive: true });
  fs.writeFileSync(F_GUARD, JSON.stringify(r, null, 2));
}

// --- Compteur d'actions par auteur sur une fenêtre glissante (testable) ---
export class Compteur {
  constructor(fenetre = SEUILS.fenetre) { this.fenetre = fenetre; this.actions = new Map(); }
  ajouter(auteur, type, cible, maintenant = Date.now()) {
    const cle = `${auteur}:${type}`;
    const liste = (this.actions.get(cle) ?? []).filter((x) => maintenant - x.t < this.fenetre);
    liste.push({ t: maintenant, cible });
    this.actions.set(cle, liste);
    return liste.length;
  }
  cibles(auteur, type) { return (this.actions.get(`${auteur}:${type}`) ?? []).map((x) => x.cible); }
}

// Faux cadeaux Nitro / liens d'arnaque classiques.
export function estArnaque(texte = '') {
  const t = texte.toLowerCase();
  return /(free|gratuit|giveaway|cadeau).{0,30}nitro|nitro.{0,30}(free|gratuit|giveaway|cadeau)/.test(t)
    || /discord-?gift\.|dlscord|discorcl|disc0rd|steamcommunlty|steamcomrnunity/.test(t);
}
export const mentionneTout = (message) => message.mentions?.everyone || /@(everyone|here)\b/.test(message.content ?? '');

// --- État ---
const compteur = new Compteur();
const salonsSupprimes = new Map(); // id -> instantané du salon supprimé
const rolesSupprimes = new Map(); // id -> instantané du rôle supprimé
const incidents = new Map(); // auteurId -> incident en cours

function photoSalon(c) {
  return {
    id: c.id, name: c.name, type: c.type, parentId: c.parentId ?? null, position: c.rawPosition ?? c.position ?? 0,
    topic: c.topic ?? undefined, nsfw: c.nsfw ?? undefined, rateLimitPerUser: c.rateLimitPerUser ?? undefined,
    bitrate: c.bitrate ?? undefined, userLimit: c.userLimit ?? undefined,
    permissionOverwrites: [...(c.permissionOverwrites?.cache?.values() ?? [])].map((o) => ({ id: o.id, type: o.type, allow: o.allow.bitfield, deny: o.deny.bitfield })),
  };
}
function photoRole(r) {
  return { id: r.id, name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: r.permissions.bitfield, position: r.position, membres: [...r.members.keys()] };
}

async function estDeConfiance(guild, userId) {
  if (!userId) return true;
  if (userId === guild.ownerId || userId === guild.client.user.id) return true;
  if (lireReglages().confiance.includes(userId)) return true;
  const m = await guild.members.fetch(userId).catch(() => null);
  return Boolean(m?.user.bot && m.joinedTimestamp && Date.now() - m.joinedTimestamp > SEPT_JOURS);
}

// --- Salon des rapports (privé : propriétaire, Fondateur, Admin, Responsable) ---
async function salonRapports(guild) {
  const salons = await guild.channels.fetch();
  let salon = salons.find((c) => c?.name === NOM_SALON_RAPPORTS && c.type === ChannelType.GuildText);
  if (salon) return salon;
  const roles = await guild.roles.fetch();
  const chefs = roles.filter((r) => STAFF_DECIDEUR.some((n) => r.name.toLowerCase().includes(n.toLowerCase())));
  salon = await guild.channels.create({
    name: NOM_SALON_RAPPORTS, type: ChannelType.GuildText, topic: '🛡️ Rapports de la garde anti-nuke de Naufragés Bot',
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: guild.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.EmbedLinks] },
      ...chefs.map((r) => ({ id: r.id, allow: [PermissionFlagsBits.ViewChannel], deny: [PermissionFlagsBits.SendMessages] })),
    ],
    reason: 'Garde anti-nuke',
  });
  await salon.send({ embeds: [new EmbedBuilder().setColor(BLEU).setTitle('🛡️ Bienvenue dans #guard-rapports').setDescription('Les rapports d\'incident de la garde apparaissent ici : un seul message par incident, zéro spam.')] }).catch(() => {});
  return salon;
}

// --- Incident : sanction, restauration, rapport unique ---
const LIBELLES = { salons: 'Suppression massive de salons', roles: 'Suppression massive de rôles', bans: 'Bannissements / expulsions en masse', creations: 'Création massive de salons', webhook: 'Webhook non autorisé' };

function incident(guild, auteurId, declencheur) {
  let inc = incidents.get(auteurId);
  if (!inc) {
    inc = { auteurId, declencheurs: new Set(), salons: new Set(), roles: new Set(), crees: new Set(), webhooks: [], messages: 0, sanction: null, restauration: null, debut: Date.now(), timer: null, guild };
    incidents.set(auteurId, inc);
  }
  inc.declencheurs.add(declencheur);
  return inc;
}

async function sanctionner(inc) {
  if (inc.sanction) return;
  inc.sanction = '⏳';
  const { guild, auteurId } = inc;
  const m = await guild.members.fetch(auteurId).catch(() => null);
  if (!m) { inc.sanction = 'Auteur introuvable (déjà parti)'; return; }
  let roles = 'rôles retirés';
  await m.roles.set([], 'Garde anti-nuke : rôles retirés').catch(() => { roles = 'rôles NON retirés (son rôle est au-dessus du mien)'; });
  const ban = await guild.members.ban(auteurId, { reason: `Garde anti-nuke : ${[...inc.declencheurs].map((d) => LIBELLES[d]).join(', ')}` }).then(() => true).catch(() => false);
  inc.sanction = ban ? `Banni (${roles})` : `Bannissement impossible (${roles}) : mets le rôle du bot au-dessus de tout le staff`;
}

async function restaurer(inc) {
  const { guild } = inc;
  const total = inc.salons.size + inc.roles.size;
  if (!total && !inc.crees.size) return;
  let ok = 0;
  // Rôles d'abord (les permissions des salons peuvent en dépendre).
  const nouveauxRoles = new Map();
  for (const id of inc.roles) {
    const r = rolesSupprimes.get(id);
    if (!r) continue;
    try {
      const nouveau = await guild.roles.create({ name: r.name, color: r.color, hoist: r.hoist, mentionable: r.mentionable, permissions: r.permissions, reason: 'Garde anti-nuke : restauration' });
      await nouveau.setPosition(Math.max(1, r.position)).catch(() => {});
      for (const uid of r.membres) await guild.members.fetch(uid).then((mm) => mm.roles.add(nouveau)).catch(() => {});
      nouveauxRoles.set(id, nouveau.id);
      ok++;
    } catch (e) { console.error('Guard rôle :', e.message); }
  }
  // Puis les catégories, puis les autres salons, dans l'ordre d'origine.
  const photos = [...inc.salons].map((id) => salonsSupprimes.get(id)).filter(Boolean)
    .sort((a, b) => (b.type === ChannelType.GuildCategory) - (a.type === ChannelType.GuildCategory) || a.position - b.position);
  const nouveauxSalons = new Map();
  for (const s of photos) {
    try {
      const parent = s.parentId ? (nouveauxSalons.get(s.parentId) ?? (guild.channels.cache.has(s.parentId) ? s.parentId : null)) : null;
      const c = await guild.channels.create({
        name: s.name, type: s.type, parent, topic: s.topic, nsfw: s.nsfw, rateLimitPerUser: s.rateLimitPerUser,
        bitrate: s.bitrate, userLimit: s.userLimit,
        permissionOverwrites: s.permissionOverwrites
          .map((o) => ({ ...o, id: nouveauxRoles.get(o.id) ?? o.id }))
          .filter((o) => o.type === OverwriteType.Member || guild.roles.cache.has(o.id)),
        reason: 'Garde anti-nuke : restauration',
      });
      nouveauxSalons.set(s.id, c.id);
      ok++;
      inc.restauration = `${ok}/${total} restaurés…`;
    } catch (e) { console.error('Guard salon :', e.message); }
  }
  if (nouveauxSalons.size) {
    await guild.channels.setPositions(photos.filter((s) => nouveauxSalons.has(s.id)).map((s) => ({ channel: nouveauxSalons.get(s.id), position: s.position }))).catch(() => {});
  }
  // Salons créés en masse : supprimés.
  let effaces = 0;
  for (const id of inc.crees) await guild.channels.delete(id, 'Garde anti-nuke : création massive').then(() => effaces++).catch(() => {});
  inc.nouveauxSalons = nouveauxSalons;
  inc.restauration = [
    total ? `${ok}/${total} restauré${ok > 1 ? 's' : ''} : noms${inc.salons.size ? ', catégories et ordre' : ''} conservés (les anciens messages sont perdus)` : null,
    inc.crees.size ? `${effaces}/${inc.crees.size} salon(s) créé(s) en masse supprimé(s)` : null,
  ].filter(Boolean).join('\n');
}

function planifierRapport(inc) {
  clearTimeout(inc.timer);
  inc.timer = setTimeout(() => publierRapport(inc).catch((e) => console.error('Guard rapport :', e.message)), 6_000);
}

async function publierRapport(inc) {
  incidents.delete(inc.auteurId);
  const { guild } = inc;
  if (inc.salons.size || inc.roles.size || inc.crees.size) await restaurer(inc);
  const salon = await salonRapports(guild).catch(() => null);
  const nomsSalons = [...inc.salons].map((id) => salonsSupprimes.get(id)?.name).filter(Boolean);
  const embed = new EmbedBuilder().setColor(inc.sanction?.startsWith('Banni') || !inc.sanction ? VERT : ROUGE)
    .setTitle('🛡️ Rapport d\'incident')
    .addFields(
      { name: 'Déclencheur', value: [...inc.declencheurs].map((d) => LIBELLES[d]).join('\n') },
      { name: 'Auteur', value: inc.auteurId.startsWith('webhook-') ? `Webhook inconnu (${inc.auteurId.slice(8)})` : `<@${inc.auteurId}> (${inc.auteurId})` },
    )
    .setTimestamp(inc.debut);
  if (nomsSalons.length) embed.addFields({ name: `Salons supprimés : ${nomsSalons.length}`, value: nomsSalons.map((n) => `#${n}`).join(' ').slice(0, 1000) });
  if (inc.roles.size) embed.addFields({ name: `Rôles supprimés : ${inc.roles.size}`, value: [...inc.roles].map((id) => rolesSupprimes.get(id)?.name ?? id).join(', ').slice(0, 1000) });
  if (inc.webhooks.length) embed.addFields({ name: 'Webhooks', value: inc.webhooks.join('\n').slice(0, 1000) });
  if (inc.messages) embed.addFields({ name: 'Messages effacés', value: `${inc.messages} (mention @everyone/@here ou arnaque)` });
  if (inc.restauration) embed.addFields({ name: 'Restauration', value: `Terminée : ${inc.restauration}` });
  embed.addFields({ name: 'Sanction', value: inc.sanction ?? 'Aucune (auteur de confiance ou webhook seul)' });
  if (inc.nouveauxSalons?.size) embed.setFooter({ text: 'Les salons recréés ont de nouveaux identifiants : vérifie les réglages qui les utilisent (onglet Environnement).' });
  for (const id of inc.salons) salonsSupprimes.delete(id);
  for (const id of inc.roles) rolesSupprimes.delete(id);
  if (salon) await salon.send({ embeds: [embed], allowedMentions: { parse: [] } });
  console.log('Guard : incident', [...inc.declencheurs].join(','), inc.auteurId);
}

// --- Événements ---
export function brancherGuard(client) {
  client.on('channelDelete', (c) => { if (c.guild) salonsSupprimes.set(c.id, photoSalon(c)); setTimeout(() => { if (![...incidents.values()].some((x) => x.salons.has(c.id))) salonsSupprimes.delete(c.id); }, 120_000); });
  client.on('roleDelete', (r) => { rolesSupprimes.set(r.id, photoRole(r)); setTimeout(() => { if (![...incidents.values()].some((x) => x.roles.has(r.id))) rolesSupprimes.delete(r.id); }, 120_000); });

  client.on('guildAuditLogEntryCreate', async (entree, guild) => {
    try {
      if (!lireReglages().actif) return;
      const auteur = entree.executorId;
      const type = {
        [AuditLogEvent.ChannelDelete]: 'salons', [AuditLogEvent.RoleDelete]: 'roles', [AuditLogEvent.ChannelCreate]: 'creations',
        [AuditLogEvent.MemberBanAdd]: 'bans', [AuditLogEvent.MemberKick]: 'bans', [AuditLogEvent.WebhookCreate]: 'webhook',
      }[entree.action];
      if (!type || await estDeConfiance(guild, auteur)) return;

      if (type === 'webhook') {
        const inc = incident(guild, auteur, 'webhook');
        const supprime = await client.fetchWebhook(entree.targetId).then((w) => w.delete('Garde : webhook non autorisé')).then(() => true).catch(() => false);
        inc.webhooks.push(`${supprime ? '🗑️ Supprimé' : '⚠️ Pas pu supprimer'} : ${entree.changes?.find((c) => c.key === 'name')?.new ?? entree.targetId}`);
        await sanctionner(inc); // créer un webhook en douce = compte sans doute piraté
        return planifierRapport(inc);
      }

      const n = compteur.ajouter(auteur, type, entree.targetId);
      const seuil = { salons: SEUILS.salonsSupprimes, roles: SEUILS.rolesSupprimes, creations: SEUILS.salonsCrees, bans: SEUILS.bans }[type];
      const enCours = incidents.get(auteur);
      if (n < seuil && !enCours) return;
      const inc = enCours ?? incident(guild, auteur, type);
      inc.declencheurs.add(type);
      const cibles = n >= seuil ? compteur.cibles(auteur, type) : [entree.targetId];
      for (const id of cibles) {
        if (type === 'salons') inc.salons.add(id);
        else if (type === 'roles') inc.roles.add(id);
        else if (type === 'creations') inc.crees.add(id);
      }
      await sanctionner(inc);
      planifierRapport(inc);
    } catch (e) { console.error('Guard :', e.message); }
  });

  // Messages de webhook : @everyone/@here ou arnaque => effacés tout de suite.
  client.on('messageCreate', async (message) => {
    if (!message.guild || !message.webhookId || !lireReglages().actif) return;
    if (lireReglages().webhooksOk.includes(message.webhookId)) return;
    if (!mentionneTout(message) && !estArnaque(`${message.content} ${message.embeds.map((e) => `${e.title ?? ''} ${e.description ?? ''}`).join(' ')}`)) return;
    const wh = await message.fetchWebhook().catch(() => null);
    if (wh?.owner?.id && await estDeConfiance(message.guild, wh.owner.id)) return; // webhook créé par quelqu'un de confiance
    const efface = await message.delete().then(() => true).catch(() => false);
    const inc = incident(message.guild, wh?.owner?.id ?? `webhook-${message.webhookId}`, 'webhook');
    inc.messages += efface ? 1 : 0;
    if (wh) {
      const ok = await wh.delete('Garde : message @everyone / arnaque').then(() => true).catch(() => false);
      inc.webhooks.push(`${ok ? '🗑️ Supprimé' : '⚠️ Pas pu supprimer'} : ${wh.name} dans #${message.channel.name}`);
    }
    planifierRapport(inc);
  });
}

// --- /guard ---
const PERMS_NECESSAIRES = ['ViewAuditLog', 'ManageChannels', 'ManageRoles', 'BanMembers', 'ManageWebhooks', 'ManageMessages'];
export async function commandeGuard(i) {
  const sous = i.options.getSubcommand();
  const r = lireReglages();
  if (sous === 'statut') {
    const moi = i.guild.members.me;
    const manque = PERMS_NECESSAIRES.filter((p) => !moi.permissions.has(PermissionFlagsBits[p]));
    const salon = await salonRapports(i.guild).catch(() => null);
    return i.reply({
      flags: MessageFlags.Ephemeral,
      embeds: [new EmbedBuilder().setColor(manque.length ? ROUGE : VERT).setTitle(`🛡️ Garde anti-nuke : ${r.actif ? 'active' : 'en pause'}`).setDescription([
        `• Suppression de **${SEUILS.salonsSupprimes} salons** ou **${SEUILS.rolesSupprimes} rôles**, **${SEUILS.bans} bans/expulsions** ou **${SEUILS.salonsCrees} créations de salons** en ${SEUILS.fenetre / 1000} s : l'auteur perd ses rôles, est banni, et tout est restauré.`,
        '• Webhook créé par quelqu\'un qui n\'est pas de confiance : supprimé tout de suite.',
        '• Message de webhook avec @everyone/@here ou fausse Nitro : effacé tout de suite.',
        '',
        `De confiance : le propriétaire, les bots présents depuis 7 jours${r.confiance.length ? `, ${r.confiance.map((id) => `<@${id}>`).join(', ')}` : ''}.`,
        `Rapports : ${salon ?? '#guard-rapports (pas pu le créer)'}`,
        manque.length ? `\n⚠️ **Permissions manquantes au bot** : ${manque.join(', ')}. Donne-les à son rôle (ou « Administrateur ») et place-le **tout en haut** de la liste des rôles.` : `\n✅ Toutes les permissions sont là. Garde le rôle du bot **tout en haut** de la liste des rôles.`,
      ].join('\n'))],
    });
  }
  // Le reste : seulement le propriétaire du serveur (un admin piraté ne doit pas pouvoir couper la garde).
  if (i.user.id !== i.guild.ownerId) return i.reply({ content: '🚫 Seul le propriétaire du serveur peut changer les réglages de la garde.', flags: MessageFlags.Ephemeral });
  if (sous === 'activer') {
    r.actif = i.options.getBoolean('actif');
    ecrireReglages(r);
    return i.reply({ content: r.actif ? '🛡️ Garde activée.' : '⏸️ Garde en pause.', flags: MessageFlags.Ephemeral });
  }
  if (sous === 'confiance') {
    const u = i.options.getUser('membre');
    const ajouter = i.options.getString('action') !== 'retirer';
    r.confiance = ajouter ? [...new Set([...r.confiance, u.id])] : r.confiance.filter((x) => x !== u.id);
    ecrireReglages(r);
    return i.reply({ content: ajouter ? `✅ ${u} est de confiance : la garde ne le sanctionnera pas.` : `➖ ${u} n'est plus de confiance.`, flags: MessageFlags.Ephemeral });
  }
  return null;
}
