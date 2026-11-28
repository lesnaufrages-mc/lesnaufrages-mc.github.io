import fs from 'node:fs';
import path from 'node:path';
import {
  ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits,
} from 'discord.js';
import { normaliser } from './roles.js';
import { SALON_BOOST } from './extras.js';
import { liensVote, messageVotes } from './votes.js';

// Vie de la communauté :
//  1. Rôle « Supporter » pour les membres qui affichent le TAG du serveur à côté de leur pseudo.
//  2. Anniversaires : /anniversaire-set, /anniversaire-liste, annonce à 9 h + rôle du jour.
//  3. Promotions : quand quelqu'un reçoit un grade du staff, félicitations dans #général.
//  4. Boosts : annonce quand le serveur passe un palier (niveau 1, 2, 3).

const lire = (f, d) => { try { return JSON.parse(fs.readFileSync(path.resolve('data', f), 'utf8')); } catch { return d; } };
const ecrire = (f, v) => { try { fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(path.resolve('data', f), JSON.stringify(v, null, 1)); } catch (e) { console.error(f, e.message); } };

export const ROLE_SUPPORTER = '🏷️・Supporter';
export const ROLE_ANNIV = '🎂・Anniversaire';
const SALON_ANNIV = '🎂・anniversaires';

async function role(guild, nom, options = {}) {
  const roles = await guild.roles.fetch();
  return roles.find((r) => r.name === nom)
    ?? await guild.roles.create({ name: nom, reason: 'Vie de la communauté', ...options }).catch((e) => { console.error(`Rôle ${nom} :`, e.message); return null; });
}
export const salonGeneral = (guild) => guild.channels.cache.find((c) => c.type === ChannelType.GuildText && normaliser(c.name).includes('general'))
  ?? guild.systemChannel;

// ---------------------------------------------------------------------------
// 1. Tag du serveur
// ---------------------------------------------------------------------------
export const porteLeTag = (user, guildId) => user?.primaryGuild?.identityGuildId === guildId && user.primaryGuild.identityEnabled !== false;

async function appliquerTag(membre, roleSup, annoncer) {
  const a = membre.roles.cache.has(roleSup.id);
  const doit = porteLeTag(membre.user, membre.guild.id);
  if (doit && !a) {
    await membre.roles.add(roleSup, 'Porte le tag du serveur').catch(() => {});
    if (annoncer) {
      await salonGeneral(membre.guild)?.send({
        content: `💜 Merci ${membre} de porter le tag **${membre.user.primaryGuild?.tag ?? 'des Naufragés'}** ! Tu reçois le rôle **${ROLE_SUPPORTER}**.`,
        allowedMentions: { users: [membre.id] },
      }).catch(() => {});
    }
    return 1;
  }
  if (!doit && a) { await membre.roles.remove(roleSup, 'Ne porte plus le tag du serveur').catch(() => {}); return -1; }
  return 0;
}

export async function verifierTags(guild) {
  const roleSup = await role(guild, ROLE_SUPPORTER, { color: 0xb57edc, hoist: true });
  if (!roleSup) return;
  const membres = await guild.members.fetch();
  let plus = 0; let moins = 0;
  for (const m of membres.filter((x) => !x.user.bot).values()) {
    const r = await appliquerTag(m, roleSup, false);
    if (r > 0) plus++; else if (r < 0) moins++;
  }
  ecrire('tags.json', { quand: new Date().toISOString(), porteurs: membres.filter((m) => porteLeTag(m.user, guild.id)).size, plus, moins });
  if (plus || moins) console.log(`Tag du serveur : +${plus} / -${moins} Supporter`);
}

// Changement de profil (tag mis ou retiré) : réaction immédiate.
export async function changementUtilisateur(ancien, nouveau, guild) {
  if (nouveau.bot || porteLeTag(ancien, guild.id) === porteLeTag(nouveau, guild.id)) return;
  const membre = await guild.members.fetch(nouveau.id).catch(() => null);
  const roleSup = guild.roles.cache.find((r) => r.name === ROLE_SUPPORTER);
  if (membre && roleSup) await appliquerTag(membre, roleSup, true);
}

// ---------------------------------------------------------------------------
// 2. Anniversaires
// ---------------------------------------------------------------------------
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
export const dateValide = (j, m) => m >= 1 && m <= 12 && j >= 1 && j <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
export function bruxelles(d = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-BE', { timeZone: 'Europe/Brussels', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hour12: false })
    .formatToParts(d).map((x) => [x.type, Number(x.value)]));
  return { a: p.year, m: p.month, j: p.day, h: p.hour % 24 };
}
const bissextile = (a) => (a % 4 === 0 && a % 100 !== 0) || a % 400 === 0;
// Qui fête son anniversaire ce jour-là ? (29 février fêté le 28 les autres années)
export function fetes(liste, { j, m, a }) {
  return Object.entries(liste).filter(([, d]) => (d.j === j && d.m === m) || (d.j === 29 && d.m === 2 && !bissextile(a) && j === 28 && m === 2)).map(([id]) => id);
}
// Prochains anniversaires, triés à partir d'aujourd'hui.
export function prochains(liste, { j, m }, limite = 15) {
  const rang = (d) => ((d.m - m) * 31 + (d.j - j) + 12 * 31) % (12 * 31);
  return Object.entries(liste).map(([id, d]) => ({ id, ...d, r: rang(d) })).sort((x, y) => x.r - y.r).slice(0, limite);
}

async function salonAnniv(guild) {
  const salons = await guild.channels.fetch();
  let s = salons.find((c) => c?.name === SALON_ANNIV && c.type === ChannelType.GuildText);
  if (!s) {
    const gen = salonGeneral(guild);
    s = await guild.channels.create({
      name: SALON_ANNIV, type: ChannelType.GuildText, parent: gen?.parentId ?? null, topic: '🎂 Les anniversaires des Naufragés · /anniversaire-set',
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.SendMessages] },
        { id: guild.members.me.id, allow: [PermissionFlagsBits.SendMessages] },
      ],
      reason: 'Anniversaires',
    }).catch((e) => { console.error('Salon anniversaires :', e.message); return null; });
  }
  return s;
}

export async function verifierAnniversaires(guild) {
  const t = bruxelles();
  const etat = lire('anniversaires-etat.json', {});
  const cle = `${t.a}-${t.m}-${t.j}`;
  if (etat.jour === cle || t.h < 9) return;
  const roleA = await role(guild, ROLE_ANNIV, { color: 0xff8fab, hoist: true });
  // Le rôle de la veille est retiré
  if (roleA) for (const m of roleA.members.values()) await m.roles.remove(roleA, 'Fin de l\'anniversaire').catch(() => {});
  const ids = fetes(lire('anniversaires.json', {}), t);
  const presents = [];
  for (const id of ids) {
    const m = await guild.members.fetch(id).catch(() => null);
    if (!m) continue;
    presents.push(m);
    if (roleA) await m.roles.add(roleA, 'Anniversaire').catch(() => {});
  }
  ecrire('anniversaires-etat.json', { jour: cle, fetes: presents.map((m) => m.id) });
  if (!presents.length) return;
  const salon = await salonAnniv(guild);
  await salon?.send({
    content: `🎂 Joyeux anniversaire ${presents.join(', ')} ! 🎉`,
    embeds: [new EmbedBuilder().setColor(0xff8fab).setTitle('🎉 Joyeux anniversaire !')
      .setDescription(`Toute la communauté des Naufragés ${presents.length > 1 ? 'vous' : 'te'} souhaite une excellente journée ! 🏝️❤️\n\nVenez lui souhaiter dans <#${salonGeneral(guild)?.id ?? salon.id}> 🥳`)],
    allowedMentions: { users: presents.map((m) => m.id) },
  }).catch(() => {});
}

async function annivSet(i) {
  const j = i.options.getInteger('jour'); const m = i.options.getInteger('mois');
  if (!dateValide(j, m)) return i.reply({ content: '📅 Cette date n\'existe pas.', flags: MessageFlags.Ephemeral });
  const liste = lire('anniversaires.json', {});
  liste[i.user.id] = { j, m };
  ecrire('anniversaires.json', liste);
  await salonAnniv(i.guild);
  return i.reply({ content: `🎂 C'est noté : **${j} ${MOIS[m - 1]}**. Le bot te le souhaitera ce jour-là à 9 h ! (\`/anniversaire-retirer\` pour l'effacer)`, flags: MessageFlags.Ephemeral });
}
async function annivRetirer(i) {
  const liste = lire('anniversaires.json', {});
  delete liste[i.user.id];
  ecrire('anniversaires.json', liste);
  return i.reply({ content: '🗑️ Ta date d\'anniversaire est effacée.', flags: MessageFlags.Ephemeral });
}
async function annivListe(i) {
  const p = prochains(lire('anniversaires.json', {}), bruxelles());
  return i.reply({
    embeds: [new EmbedBuilder().setColor(0xff8fab).setTitle('🎂 Prochains anniversaires')
      .setDescription(p.map((x) => `**${x.j} ${MOIS[x.m - 1]}** · <@${x.id}>`).join('\n') || 'Personne pour l\'instant : `/anniversaire-set` !')],
    allowedMentions: { users: [] },
  });
}

// ---------------------------------------------------------------------------
// 3. Promotions du staff + 4. paliers de boost
// ---------------------------------------------------------------------------
const MOTS_STAFF = ['fondateur', 'admin', 'responsable', 'supermodo', 'moderateur', 'modo', 'helpeur', 'helper', 'builder', 'devbot', 'animateur', 'communitymanager'];
export const estGradeStaff = (r) => !r.managed && MOTS_STAFF.some((k) => normaliser(r.name).includes(k));

export async function promotions(ancien, nouveau) {
  if (nouveau.user.bot || ancien.partial) return;
  const ajoutes = nouveau.roles.cache.filter((r) => !ancien.roles.cache.has(r.id) && estGradeStaff(r));
  if (!ajoutes.size) return;
  const deja = lire('promotions.json', {});
  for (const r of ajoutes.values()) {
    const cle = `${nouveau.id}:${r.id}`;
    if (deja[cle] && Date.now() - deja[cle] < 30 * 86_400_000) continue; // pas deux fois pour le même grade
    deja[cle] = Date.now();
    await salonGeneral(nouveau.guild)?.send({
      embeds: [new EmbedBuilder().setColor(r.color || 0xf1c40f).setTitle('🎉 Félicitations !')
        .setDescription(`${nouveau} vient d'obtenir le grade **${r.name}** ! 🏆\nBravo et bienvenue dans l'équipe, moussaillon ⚓`)
        .setThumbnail(nouveau.displayAvatarURL())],
      content: `${nouveau}`,
      allowedMentions: { users: [nouveau.id] },
    }).catch(() => {});
  }
  ecrire('promotions.json', deja);
}

export async function palierBoost(ancien, nouveau) {
  if ((nouveau.premiumTier ?? 0) <= (ancien.premiumTier ?? 0)) return;
  const salon = await nouveau.channels.fetch(SALON_BOOST).catch(() => null);
  await salon?.send({
    embeds: [new EmbedBuilder().setColor(0xf47fff).setTitle(`🔓 Niveau ${nouveau.premiumTier} débloqué !`)
      .setDescription(`🎉 **Les Naufragés Community** passe au **niveau ${nouveau.premiumTier}** grâce à ses **${nouveau.premiumSubscriptionCount} boosts** !\nMerci à tous les boosters 💜`)],
  }).catch(() => {});
}

// ---------------------------------------------------------------------------
// 5. Rappel de vote quotidien (18 h) dans #🗳️・votes, avec les liens ; rôle 🔔・Rappel vote mentionné.
// Le bot ne vote jamais à la place des joueurs (interdit par les sites de classement).
// ---------------------------------------------------------------------------
export const ROLE_VOTE = '🔔・Rappel vote';
export async function rappelVote(guild) {
  const t = bruxelles();
  const etat = lire('rappel-vote.json', {});
  const cle = `${t.a}-${t.m}-${t.j}`;
  if (etat.jour === cle || t.h < 18) return;
  const liens = liensVote();
  ecrire('rappel-vote.json', { ...etat, jour: cle });
  if (!liens.length) return; // pas encore de site de vote
  const salon = guild.channels.cache.find((c) => c.name === '🗳️・votes' && c.type === ChannelType.GuildText);
  if (!salon) return;
  if (etat.message) await salon.messages.delete(etat.message).catch(() => {});
  const r = guild.roles.cache.find((x) => x.name === ROLE_VOTE);
  const m = messageVotes(liens);
  const msg = await salon.send({
    ...m,
    content: `${r ?? ''} ⏰ **C'est l'heure de voter !** Un vote par site, ça prend 30 secondes et tu es récompensé en jeu 🎁`,
    allowedMentions: { roles: r ? [r.id] : [] },
  }).catch(() => null);
  ecrire('rappel-vote.json', { jour: cle, message: msg?.id ?? null });
}

export const actionsCommunaute = {
  'rappel-vote': async (i) => {
    const r = await role(i.guild, ROLE_VOTE, { mentionable: true });
    if (!r) return i.reply({ content: 'Rôle introuvable.', flags: MessageFlags.Ephemeral });
    const a = i.member.roles.cache.has(r.id);
    await (a ? i.member.roles.remove(r) : i.member.roles.add(r)).catch(() => {});
    return i.reply({ content: a ? '🔕 Plus de rappel de vote.' : '🔔 Tu seras prévenu chaque jour à 18 h pour voter. Merci !', flags: MessageFlags.Ephemeral });
  },
  'anniversaire-set': annivSet,
  'anniversaire-retirer': annivRetirer,
  'anniversaire-liste': annivListe,
  'tag-serveur': async (i) => {
    const t = lire('tags.json', {});
    return i.reply({
      content: `🏷️ **${t.porteurs ?? 0}** membre(s) portent le tag du serveur et ont le rôle **${ROLE_SUPPORTER}**.\n`
        + 'Pour le mettre : Paramètres utilisateur › Profils › **Tag du serveur** › choisis Les Naufragés. Le rôle arrive tout seul.',
      flags: MessageFlags.Ephemeral,
    });
  },
};

