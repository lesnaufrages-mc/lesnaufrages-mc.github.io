import fs from 'node:fs';
import path from 'node:path';
import { EmbedBuilder, PermissionFlagsBits, MessageFlags, ChannelType } from 'discord.js';

// ============================================================================
// Anti-pub : liens d'invitation vers d'autres serveurs Discord.
// Dans les catégories publiques (ANTIPUB_CATEGORIES), sauf le salon publicité
// (ANTIPUB_SALONS_OK), un lien discord.gg / discord.com/invite / … vers un AUTRE
// serveur est effacé et l'auteur reçoit un avertissement (rien de plus).
// Le staff (Gérer les messages / Exclure temporairement / Admin) est exempté,
// tout comme les liens vers notre propre serveur.
// Avertissements gardés dans data/avertissements.json, visibles avec /avertissements.
// ============================================================================

const liste = (v, defaut) => (v ?? defaut).split(/[\s,;]+/).filter(Boolean);
export const CATEGORIES = liste(process.env.ANTIPUB_CATEGORIES, '1573085261359751268,828255171045228554');
export const SALONS_OK = liste(process.env.ANTIPUB_SALONS_OK, '828255209113387058');
// Salons dont le nom contient l'un de ces mots : aussi autorisés (le salon des factions pour recruter).
export const MOTS_SALONS_OK = liste(process.env.ANTIPUB_MOTS_SALONS_OK, 'faction').map((x) => x.toLowerCase());
const SALON_LOGS = process.env.ANTIPUB_SALON_LOGS_ID || null; // facultatif : sinon #guard-rapports s'il existe
const ORANGE = 0xf59e0b;

// --- Détection (testable) ---
// Tolère les espaces et « [.] » glissés pour contourner : « discord . gg / abc ».
const RE_INVITE = /(?:https?:\/\/)?(?:www\.)?(?:discord(?:app)?\s*(?:\.|\[\.\]|\(\.\))\s*(?:com|net)\s*\/\s*invite|discord\s*(?:\.|\[\.\]|\(\.\))\s*(?:gg|io|me|li|plus)|dsc\s*\.\s*gg|invite\s*\.\s*gg|discord\s*\.\s*link)\s*\/\s*([a-z0-9-]{2,32})/gi;
export function trouverInvitations(texte = '') {
  const codes = [];
  for (const m of String(texte).matchAll(RE_INVITE)) codes.push(m[1]);
  return [...new Set(codes)];
}

// Le salon est-il surveillé ? (un fil compte comme son salon parent)
export function salonSurveille(salon, categories = CATEGORIES, salonsOk = SALONS_OK, mots = MOTS_SALONS_OK) {
  if (!salon) return false;
  const base = salon.isThread?.() ? salon.parent : salon;
  if (!base) return false;
  if (salonsOk.includes(base.id) || salonsOk.includes(salon.id)) return false;
  if (mots.some((mot) => (base.name ?? '').toLowerCase().includes(mot))) return false;
  return categories.includes(base.parentId);
}

const estStaff = (m) => Boolean(m?.permissions?.has(PermissionFlagsBits.ManageMessages)
  || m?.permissions?.has(PermissionFlagsBits.ModerateMembers)
  || m?.permissions?.has(PermissionFlagsBits.Administrator));

// --- Avertissements : data/avertissements.json ---
const F_AV = path.resolve('data', 'avertissements.json');
export function lireAvertissements() { try { return JSON.parse(fs.readFileSync(F_AV, 'utf8')); } catch { return {}; } }
function ecrireAvertissements(d) { fs.mkdirSync(path.dirname(F_AV), { recursive: true }); fs.writeFileSync(F_AV, JSON.stringify(d, null, 2)); }
export function ajouterAvertissement(userId, entree, data = lireAvertissements(), sauver = ecrireAvertissements) {
  (data[userId] ??= []).push({ date: new Date().toISOString(), ...entree });
  sauver(data);
  return data[userId].length;
}

// Nos propres invitations sont permises : on demande à Discord à quel serveur mène le code (mis en cache).
const cacheCodes = new Map();
async function versAutreServeur(client, guildId, code) {
  if (cacheCodes.has(code)) return cacheCodes.get(code) !== guildId;
  const inv = await client.fetchInvite(code).catch(() => null);
  const cible = inv?.guild?.id ?? null; // lien mort ou inconnu = on le traite comme une pub
  cacheCodes.set(code, cible);
  if (cacheCodes.size > 500) cacheCodes.delete(cacheCodes.keys().next().value);
  return cible !== guildId;
}

async function salonLogs(guild) {
  if (SALON_LOGS) return guild.channels.fetch(SALON_LOGS).catch(() => null);
  return guild.channels.cache.find((c) => c.name === 'guard-rapports' && c.type === ChannelType.GuildText) ?? null;
}

async function verifierMessage(message) {
  if (!message.guild || message.author?.bot || message.webhookId || message.system) return;
  if (!salonSurveille(message.channel)) return;
  const texte = [message.content, ...(message.messageSnapshots?.map((s) => s.content ?? '') ?? []),
    ...message.embeds.map((e) => `${e.url ?? ''} ${e.description ?? ''}`)].join(' ');
  const codes = trouverInvitations(texte);
  if (!codes.length) return;
  const membre = message.member ?? await message.guild.members.fetch(message.author.id).catch(() => null);
  if (estStaff(membre)) return;
  let pub = false;
  for (const code of codes) if (await versAutreServeur(message.client, message.guild.id, code)) { pub = true; break; }
  if (!pub) return;

  const efface = await message.delete().then(() => true).catch(() => false);
  const total = ajouterAvertissement(message.author.id, { raison: 'Pub pour un autre serveur Discord', salon: message.channel.id, extrait: message.content.slice(0, 200) });
  console.log(`Anti-pub : ${message.author.tag} dans #${message.channel.name} (avertissement n°${total}${efface ? '' : ', message PAS effacé : permission « Gérer les messages » ?'})`);

  const avert = `⚠️ ${message.author}, la pub pour d'autres serveurs Discord est interdite ici. Elle est permise seulement dans <#${SALONS_OK[0]}> (et le salon des factions pour recruter). **Avertissement n°${total}.**`;
  const rep = await message.channel.send({ content: avert, allowedMentions: { users: [message.author.id] } }).catch(() => null);
  if (rep) setTimeout(() => rep.delete().catch(() => {}), 20_000);
  await message.author.send(`⚠️ Ton message sur **${message.guild.name}** (#${message.channel.name}) a été retiré : la pub pour d'autres serveurs Discord n'est autorisée que dans le salon publicité (et le salon des factions pour recruter). C'est ton avertissement n°${total}.`).catch(() => {});

  const logs = await salonLogs(message.guild);
  await logs?.send({ embeds: [new EmbedBuilder().setColor(ORANGE).setTitle('📢 Anti-pub : avertissement')
    .setDescription(`${message.author} (${message.author.tag}) dans ${message.channel}\nAvertissement n°**${total}**${efface ? '' : '\n⚠️ Message pas effacé (permission manquante)'}\n\n> ${message.content.slice(0, 300).replace(/\n/g, '\n> ')}`)
    .setTimestamp()] }).catch(() => {});
}

export function brancherAntipub(client) {
  client.on('messageCreate', (m) => verifierMessage(m).catch((e) => console.error('Anti-pub :', e.message)));
  // Quelqu'un qui ajoute le lien en modifiant son message après coup.
  client.on('messageUpdate', async (_avant, apres) => {
    const m = apres.partial ? await apres.fetch().catch(() => null) : apres;
    if (m) verifierMessage(m).catch((e) => console.error('Anti-pub :', e.message));
  });
  console.log(`Anti-pub : actif sur ${CATEGORIES.length} catégorie(s), salon(s) autorisé(s) : ${SALONS_OK.join(', ')} + noms contenant « ${MOTS_SALONS_OK.join(' / ')} »`);
}

// --- /avertissements voir|effacer ---
export function definitionAvertissements(SlashCommandBuilder) {
  return new SlashCommandBuilder().setName('avertissements').setDescription('Staff : avertissements des membres (anti-pub)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) => s.setName('voir').setDescription('Voir les avertissements d\'un membre')
      .addUserOption((o) => o.setName('membre').setDescription('Qui ?').setRequired(true)))
    .addSubcommand((s) => s.setName('effacer').setDescription('Effacer tous les avertissements d\'un membre')
      .addUserOption((o) => o.setName('membre').setDescription('Qui ?').setRequired(true)));
}

export async function commandeAvertissements(i) {
  const u = i.options.getUser('membre');
  const data = lireAvertissements();
  if (i.options.getSubcommand() === 'effacer') {
    const n = data[u.id]?.length ?? 0;
    delete data[u.id];
    ecrireAvertissements(data);
    return i.reply({ flags: MessageFlags.Ephemeral, content: `🧽 ${n} avertissement(s) effacé(s) pour ${u}.` });
  }
  const av = data[u.id] ?? [];
  const lignes = av.slice(-10).map((a, k) => `${av.length - Math.min(10, av.length) + k + 1}. <t:${Math.floor(Date.parse(a.date) / 1000)}:d> dans <#${a.salon}> : ${a.raison}`);
  return i.reply({ flags: MessageFlags.Ephemeral, content: av.length ? `**${u.tag}** : ${av.length} avertissement(s)\n${lignes.join('\n')}` : `✅ ${u} n'a aucun avertissement.` });
}
