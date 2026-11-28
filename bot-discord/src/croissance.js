import fs from 'node:fs';
import path from 'node:path';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { config, LIEN_DISCORD } from './config.js';
import { ajouterXp } from './roles.js';
import { bruxelles } from './communaute.js';

// Faire grandir le Discord :
//  1. Suivi des invitations : qui a invité qui, récompenses (rôles + XP) par palier, classement.
//     /mon-lien donne à chaque membre SON lien d'invitation permanent (compté à son nom).
//  2. Rappel de « bump » DISBOARD : quand quelqu'un fait /bump, le bot le remercie (+XP)
//     et rappelle 2 h plus tard que le bump est de nouveau possible (rôle 🔔・Rappel Bump).
// Le bot doit avoir la permission « Gérer le serveur » pour lire le nombre d'utilisations des invitations.

const F_INV = path.resolve('data', 'invitations.json');
const F_BUMP = path.resolve('data', 'bump.json');
const lire = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };
const ecrire = (f, v) => { try { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(v, null, 1)); } catch (e) { console.error('Croissance :', e.message); } };

export const PALIERS_INVIT = [
  { n: 3, nom: '📨・Recruteur', xp: 300 },
  { n: 10, nom: '🌟・Ambassadeur', xp: 1000 },
  { n: 25, nom: '👑・Légende des Naufragés', xp: 3000 },
];
export const XP_PAR_INVIT = 100;
export const AGE_MIN_JOURS = 7; // comptes plus récents = pas comptés (anti faux comptes)
const ROLE_BUMP = '🔔・Rappel Bump';
const DISBOARD_ID = '302050872383242240';
const UPGUILD_ID = '1568683080171004045'; // bot Upguild (upguild.me) : il envoie lui-même le rappel « bump disponible » dans #commandes
const DELAI_BUMP = 2 * 3600_000;

// ---------------------------------------------------------------------------
// Logique pure (testée)
// ---------------------------------------------------------------------------
export const donneesVides = () => ({ liens: {}, membres: {}, invitants: {} });

// Trouve l'invitation utilisée en comparant les compteurs avant / après l'arrivée.
export function invitationUtilisee(avant, apres) {
  const candidats = [];
  for (const [code, inv] of apres) {
    const a = avant.get(code)?.uses ?? 0;
    if ((inv.uses ?? 0) > a) candidats.push(code);
  }
  // Une invitation à usage unique disparaît quand elle est utilisée.
  if (!candidats.length) for (const [code, inv] of avant) if (!apres.has(code) && inv.maxUses && inv.uses + 1 >= inv.maxUses) candidats.push(code);
  return candidats.length === 1 ? candidats[0] : null;
}

export const valides = (s) => Math.max(0, (s?.total ?? 0) - (s?.partis ?? 0) - (s?.faux ?? 0));

// Enregistre une arrivée. Renvoie { invitant, compte, nouveauPalier } ou null.
export function enregistrerArrivee(d, { membreId, invitantId, ageJours, maintenant = Date.now() }) {
  if (!invitantId || invitantId === membreId) return null;
  const deja = d.membres[membreId];
  const s = (d.invitants[invitantId] ??= { total: 0, partis: 0, faux: 0, paliers: [] });
  if (deja && deja.par === invitantId && !deja.parti) return { invitant: invitantId, compte: valides(s), nouveauPalier: null, deja: true };
  s.total++;
  const faux = ageJours < AGE_MIN_JOURS || (deja && deja.par === invitantId); // retour du même membre = pas recompté
  if (faux) s.faux++;
  d.membres[membreId] = { par: invitantId, quand: maintenant, faux: !!faux };
  const compte = valides(s);
  const p = [...PALIERS_INVIT].reverse().find((x) => compte >= x.n && !s.paliers.includes(x.n));
  if (p) s.paliers.push(p.n);
  return { invitant: invitantId, compte, nouveauPalier: p ?? null, faux: !!faux };
}

// Classement d'un mois (« 2026-11 ») : invités arrivés ce mois-là, comptés, toujours présents.
export function topDuMois(d, mois, limite = 3) {
  const c = {};
  for (const m of Object.values(d.membres)) {
    if (m.faux || m.parti) continue;
    const dt = new Date(m.quand);
    const cle = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit' }).format(dt).slice(0, 7);
    if (cle === mois) c[m.par] = (c[m.par] ?? 0) + 1;
  }
  return Object.entries(c).map(([id, n]) => ({ id, n })).sort((a, b) => b.n - a.n).slice(0, limite);
}

export function enregistrerDepart(d, membreId) {
  const m = d.membres[membreId];
  if (!m || m.parti || m.faux) return null;
  m.parti = true;
  const s = d.invitants[m.par];
  if (s) s.partis++;
  return m.par;
}

export function topInvitations(d, limite = 10) {
  return Object.entries(d.invitants).map(([id, s]) => ({ id, valides: valides(s), ...s }))
    .filter((x) => x.valides > 0).sort((a, b) => b.valides - a.valides).slice(0, limite);
}

// Un message de DISBOARD qui confirme un bump ?
export function estBumpReussi(message) {
  if (message.author?.id !== DISBOARD_ID) return false;
  const texte = [message.content, ...(message.embeds ?? []).map((e) => `${e.title ?? ''} ${e.description ?? ''}`)].join(' ').toLowerCase();
  return /bump (done|effectu|réussi|reussi)|:thumbsup:|👍/.test(texte);
}

// ---------------------------------------------------------------------------
// Discord
// ---------------------------------------------------------------------------
let d = null;
const data = () => (d ??= { ...donneesVides(), ...lire(F_INV, {}) });
const sauver = () => ecrire(F_INV, data());
let cache = new Map(); // code -> { uses, maxUses, inviterId }
let peutLire = false;

const photo = (invites) => new Map([...invites.values()].map((i) => [i.code, { uses: i.uses ?? 0, maxUses: i.maxUses ?? 0, inviterId: i.inviterId ?? i.inviter?.id ?? null }]));

async function lireInvitations(guild) {
  try {
    const inv = await guild.invites.fetch({ cache: false });
    peutLire = true;
    return photo(inv);
  } catch (e) {
    if (peutLire || !lireInvitations.prevenu) console.error('Invitations : lecture impossible (permission « Gérer le serveur » ?)', e.message);
    lireInvitations.prevenu = true;
    peutLire = false;
    return null;
  }
}

async function roleNomme(guild, nom) {
  const roles = await guild.roles.fetch();
  return roles.find((r) => r.name === nom)
    ?? await guild.roles.create({ name: nom, reason: 'Récompenses d\'invitation / rappel bump', mentionable: nom === ROLE_BUMP }).catch((e) => { console.error(`Rôle ${nom} :`, e.message); return null; });
}

export async function preparerCroissance(client, guild) {
  const p = await lireInvitations(guild);
  if (p) cache = p;
  for (const pal of PALIERS_INVIT) await roleNomme(guild, pal.nom);
  await roleNomme(guild, ROLE_BUMP);
  client.on('inviteCreate', (i) => { if (i.guild?.id === guild.id) cache.set(i.code, { uses: i.uses ?? 0, maxUses: i.maxUses ?? 0, inviterId: i.inviterId ?? i.inviter?.id ?? null }); });
  client.on('inviteDelete', (i) => { if (i.guild?.id === guild.id) setTimeout(() => cache.delete(i.code), 5000); });
  // Rappel de bump en attente au redémarrage
  const b = lire(F_BUMP, null);
  if (b?.prochain) planifierRappelBump(client, b);
  console.log(`Invitations : suivi ${peutLire ? 'actif' : 'INACTIF (donner « Gérer le serveur » au bot)'}, ${cache.size} lien(s)`);
}

// Appelé à chaque arrivée (avant le message de bienvenue). Renvoie un texte à ajouter, ou null.
export async function arriveeInvitation(membre) {
  if (membre.user.bot) return null;
  const avant = cache;
  const apres = await lireInvitations(membre.guild);
  if (!apres) return null;
  cache = apres;
  const code = invitationUtilisee(avant, apres);
  if (!code) return null;
  const invitantId = data().liens[code] ?? (apres.get(code) ?? avant.get(code))?.inviterId;
  if (!invitantId || invitantId === membre.client.user.id) return null;
  const ageJours = (Date.now() - membre.user.createdTimestamp) / 86_400_000;
  const r = enregistrerArrivee(data(), { membreId: membre.id, invitantId, ageJours });
  sauver();
  if (!r || r.deja) return null;
  const invitant = await membre.guild.members.fetch(invitantId).catch(() => null);
  if (invitant && !r.faux) {
    ajouterXp(invitantId, invitant.displayName, XP_PAR_INVIT, undefined, Date.now(), 'invitation');
    if (r.nouveauPalier) {
      const role = await roleNomme(membre.guild, r.nouveauPalier.nom);
      if (role) await invitant.roles.add(role, `${r.compte} invitations`).catch(() => {});
      ajouterXp(invitantId, invitant.displayName, r.nouveauPalier.xp, undefined, Date.now(), 'invitation');
    }
  }
  let texte = `📨 Invité par <@${invitantId}>${r.faux ? '' : ` (**${r.compte}** invitation${r.compte > 1 ? 's' : ''})`}`;
  if (r.nouveauPalier) texte += `\n🎉 <@${invitantId}> devient **${r.nouveauPalier.nom}** !`;
  return texte;
}

export function departInvitation(membre) {
  if (enregistrerDepart(data(), membre.id)) sauver();
}

// Une réponse d'Upguild à /bump qui confirme le bump (pas un message d'attente) ?
export function estBumpUpguild(message) {
  if (message.author?.id !== UPGUILD_ID) return false;
  const cmd = message.interactionMetadata?.name ?? message.interaction?.commandName ?? message.interaction?.name ?? '';
  if (cmd && !/bump/i.test(cmd)) return false;
  const texte = [message.content, ...(message.embeds ?? []).map((e) => `${e.title ?? ''} ${e.description ?? ''}`)].join(' ').toLowerCase();
  if (!/bump/.test(texte)) return false;
  return !/attend|patiente|wait|déjà|deja|already|trop tôt|trop tot|cooldown|pas encore|not yet|disponible dans|available in|erreur|error/.test(texte);
}

// --- Bump DISBOARD ---
let minuteur = null;
function planifierRappelBump(client, b) {
  clearTimeout(minuteur);
  const attente = Math.max(5000, b.prochain - Date.now());
  minuteur = setTimeout(async () => {
    const salon = await client.channels.fetch(b.salon).catch(() => null);
    if (!salon) return;
    const role = salon.guild.roles.cache.find((r) => r.name === ROLE_BUMP);
    await salon.send({
      content: `${role ?? ''} ⏰ **On peut de nouveau bump le serveur !** Tape \`/bump\` ici : ça nous remonte en tête de DISBOARD et ramène de nouveaux naufragés. (+50 XP pour celui qui le fait)`,
      allowedMentions: { roles: role ? [role.id] : [] },
    }).catch(() => {});
    ecrire(F_BUMP, { ...b, prochain: 0 });
  }, attente);
}

async function bumpUpguild(message) {
  const qui = message.interactionMetadata?.user ?? message.interaction?.user ?? null;
  if (!qui) return;
  const m = await message.guild.members.fetch(qui.id).catch(() => null);
  ajouterXp(qui.id, m?.displayName ?? qui.username, 50, undefined, Date.now(), 'bump');
  await message.channel.send({ content: `🙏 Merci ${qui} pour le bump sur **Upguild** ! **+50 XP**. Upguild préviendra ici dès que le prochain bump est possible (2 h).`, allowedMentions: { users: [] } }).catch(() => {});
}

export async function messageBump(message) {
  if (estBumpUpguild(message)) return bumpUpguild(message);
  if (!estBumpReussi(message)) return;
  const qui = message.interactionMetadata?.user ?? message.interaction?.user ?? null;
  const b = { salon: message.channelId, prochain: Date.now() + DELAI_BUMP, par: qui?.id ?? null };
  ecrire(F_BUMP, b);
  planifierRappelBump(message.client, b);
  if (qui) {
    const m = await message.guild.members.fetch(qui.id).catch(() => null);
    ajouterXp(qui.id, m?.displayName ?? qui.username, 50, undefined, Date.now(), 'bump');
  }
  await message.channel.send({ content: `🙏 Merci ${qui ?? ''} pour le bump ! **+50 XP**. Prochain bump possible <t:${Math.floor(b.prochain / 1000)}:R>.`, allowedMentions: { users: [] } }).catch(() => {});
}

// --- Concours mensuel : le 1er du mois à 10 h, annonce du top 3 du mois passé ---
const SALON_ANNONCES = '828255179048484865';
const SALON_ANNONCE_STAFF = '883696119958364190';
const F_CONCOURS = path.resolve('data', 'concours.json');
export async function verifierConcours(client) {
  const t = bruxelles();
  if (t.j !== 1 || t.h < 10) return;
  const precedent = t.m === 1 ? `${t.a - 1}-12` : `${t.a}-${String(t.m - 1).padStart(2, '0')}`;
  const etat = lire(F_CONCOURS, {});
  if (etat.dernier === precedent) return;
  ecrire(F_CONCOURS, { dernier: precedent });
  const top = topDuMois(data(), precedent);
  const nomMois = new Date(`${precedent}-15`).toLocaleDateString('fr-BE', { month: 'long', year: 'numeric' });
  const salon = await client.channels.fetch(SALON_ANNONCES).catch(() => null);
  const medailles = ['🥇', '🥈', '🥉'];
  await salon?.send({
    content: '@everyone',
    embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle(`🏆 Concours d'invitations · ${nomMois}`)
      .setDescription(top.length
        ? `${top.map((x, k) => `${medailles[k]} <@${x.id}> · **${x.n}** invité${x.n > 1 ? 's' : ''}`).join('\n')}\n\nBravo ! Le grade **VIP** en jeu arrive très vite 🎁\n\nNouveau mois, nouveau concours : \`/mon-lien\` pour participer !`
        : 'Personne n\'a invité de nouveaux naufragés ce mois-ci… Ce mois-ci, la place est libre : `/mon-lien` !')],
    allowedMentions: { parse: ['everyone'], users: top.map((x) => x.id) },
  }).catch(() => {});
  if (top.length) {
    const staff = await client.channels.fetch(SALON_ANNONCE_STAFF).catch(() => null);
    await staff?.send({ content: `🎁 **À faire** : donner le grade **VIP** en jeu aux gagnants du concours de ${nomMois} : ${top.map((x) => `<@${x.id}>`).join(', ')}.`, allowedMentions: { users: [] } }).catch(() => {});
  }
}

// --- Commandes ---
async function monLien(i) {
  const d0 = data();
  const existant = Object.entries(d0.liens).find(([, id]) => id === i.user.id)?.[0];
  if (existant && cache.has(existant)) {
    return i.reply({ content: `🔗 Ton lien perso : https://discord.gg/${existant}\nChaque ami qui arrive avec ce lien compte pour toi (\`/invitations\`).`, flags: MessageFlags.Ephemeral });
  }
  const salon = (config.salonBienvenue && await i.guild.channels.fetch(config.salonBienvenue).catch(() => null)) ?? i.guild.systemChannel ?? i.channel;
  const inv = await salon.createInvite({ maxAge: 0, maxUses: 0, unique: true, reason: `Lien perso de ${i.user.tag}` }).catch(() => null);
  if (!inv) return i.reply({ content: `😕 Je n'arrive pas à créer ton lien. Partage celui-ci en attendant : ${LIEN_DISCORD}`, flags: MessageFlags.Ephemeral });
  d0.liens[inv.code] = i.user.id;
  cache.set(inv.code, { uses: 0, maxUses: 0, inviterId: i.user.id });
  sauver();
  return i.reply({
    content: `🔗 **Ton lien perso :** https://discord.gg/${inv.code}\n\n`
      + `Partage-le à tes potes : chaque ami qui reste compte pour toi.\n`
      + PALIERS_INVIT.map((p) => `• **${p.n}** invitations → ${p.nom} (+${p.xp} XP)`).join('\n')
      + `\n• +${XP_PAR_INVIT} XP par ami invité`,
    flags: MessageFlags.Ephemeral,
  });
}

async function commandeInvitations(i) {
  const cible = i.options.getUser('membre') ?? i.user;
  const s = data().invitants[cible.id];
  const v = valides(s);
  const suivant = PALIERS_INVIT.find((p) => v < p.n);
  const embed = new EmbedBuilder().setColor(0x2e86de).setTitle(`📨 Invitations de ${cible.username}`)
    .setDescription([
      `✅ **${v}** naufragé${v > 1 ? 's' : ''} invité${v > 1 ? 's' : ''}`,
      `👋 ${s?.partis ?? 0} parti${(s?.partis ?? 0) > 1 ? 's' : ''} · 🚫 ${s?.faux ?? 0} non compté${(s?.faux ?? 0) > 1 ? 's' : ''} (comptes de moins de ${AGE_MIN_JOURS} jours ou retours)`,
      suivant ? `\n🎯 Encore **${suivant.n - v}** pour devenir **${suivant.nom}**` : '\n👑 Tous les paliers atteints, merci !',
      '\n`/mon-lien` pour avoir ton lien perso.',
    ].join('\n'));
  if (!peutLire) embed.setFooter({ text: '⚠️ Suivi en pause : le bot a besoin de la permission « Gérer le serveur ».' });
  return i.reply({ embeds: [embed] });
}

async function commandeTop(i) {
  const top = topInvitations(data());
  const medailles = ['🥇', '🥈', '🥉'];
  const lignes = top.map((x, k) => `${medailles[k] ?? `**${k + 1}.**`} <@${x.id}> : **${x.valides}**`);
  return i.reply({
    embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle('🏆 Meilleurs recruteurs des Naufragés')
      .setDescription(lignes.join('\n') || 'Personne pour l\'instant : `/mon-lien` pour être le premier !')],
    allowedMentions: { users: [] },
  });
}

async function rappelBump(i) {
  const role = await roleNomme(i.guild, ROLE_BUMP);
  if (!role) return i.reply({ content: 'Rôle introuvable.', flags: MessageFlags.Ephemeral });
  const a = i.member.roles.cache.has(role.id);
  await (a ? i.member.roles.remove(role) : i.member.roles.add(role)).catch(() => {});
  return i.reply({ content: a ? '🔕 Tu ne seras plus prévenu pour les bumps.' : '🔔 Tu seras prévenu dès qu\'un bump est possible (toutes les 2 h). Merci !', flags: MessageFlags.Ephemeral });
}

export const actionsCroissance = {
  'mon-lien': monLien,
  invitations: commandeInvitations,
  'top-invitations': commandeTop,
  'rappel-bump': rappelBump,
};

