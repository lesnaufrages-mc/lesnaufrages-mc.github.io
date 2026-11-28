import fs from 'node:fs';
import path from 'node:path';
import {
  PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, StringSelectMenuBuilder,
} from 'discord.js';

// Rôles de la communauté (hors staff) :
//  - accès : Non-vérifié à l'arrivée, Membre après le bouton du règlement, VIP (à la main), Bot (pour les robots) ;
//  - niveaux : gagnés en parlant (messages + vocal), le bot donne le rôle du palier atteint ;
//  - à la carte : notifications et profil, choisis par les membres dans des menus.
// Les rôles sont retrouvés par leur NOM : on peut changer leur couleur, mais pas les renommer.

export const ACCES = [
  { nom: 'Membre', couleur: 0x3fae5a },
  { nom: 'Non-vérifié', couleur: 0x7f8c8d },
  { nom: 'VIP', couleur: 0xf1c40f, hoist: true },
  { nom: 'Bot', couleur: 0x5865f2, hoist: true },
];

export const PALIERS = [
  { niveau: 50, nom: 'Élite', couleur: 0xe91e63 },
  { niveau: 30, nom: 'Incontournable', couleur: 0x9b59b6 },
  { niveau: 5, nom: 'Actif', couleur: 0x3498db, garder: true }, // gardé à vie une fois atteint
  { niveau: 1, nom: 'Nouveau', couleur: 0x95a5a6 },
];

// Menus à choix. max = 1 : un seul choix possible (le précédent est retiré).
export const CATEGORIES = {
  notifs: {
    titre: '🔔 Notifications', texte: 'Choisis les alertes que tu veux recevoir', max: 8,
    roles: [
      { nom: 'Notif Annonces', emoji: '📢', desc: 'Grandes nouveautés et infos importantes' },
      { nom: 'Notif Concours', emoji: '🎁', desc: 'Tirages au sort et lots à gagner' },
      { nom: 'Notif Événements', emoji: '🎉', desc: 'Tournois, soirées jeux, animations' },
      { nom: 'Notif Mises à jour', emoji: '🔧', desc: 'Nouveau contenu et maintenances' },
      { nom: 'Notif Partenariats', emoji: '🤝', desc: 'Collaborations avec d\'autres serveurs' },
      { nom: 'Notif Sondages', emoji: '📊', desc: 'Votes sur l\'avenir du serveur' },
      { nom: 'Notif Recrutement', emoji: '💼', desc: 'Quand le staff recrute' },
      { nom: 'Notif YouTube / Live', emoji: '🎥', desc: 'Nouvelles vidéos et lives' },
    ],
  },
  plateforme: {
    titre: '🎮 Plateforme', texte: 'Sur quoi joues-tu à Minecraft ?', max: 3,
    roles: [
      { nom: 'Java', emoji: '☕', desc: 'PC (Java Edition)' },
      { nom: 'Bedrock', emoji: '📱', desc: 'Téléphone, tablette, Windows 10/11' },
      { nom: 'Console', emoji: '🕹️', desc: 'Xbox, PlayStation, Switch' },
    ],
  },
  specialite: {
    titre: '⚔️ Spécialité', texte: 'Ton point fort en jeu', max: 4,
    roles: [
      { nom: 'PvP', emoji: '⚔️', desc: 'Combat' },
      { nom: 'Bâtisseur', emoji: '🧱', desc: 'Construction' },
      { nom: 'Redstone', emoji: '🔴', desc: 'Mécanismes' },
      { nom: 'Farmer', emoji: '🌾', desc: 'Fermes et ressources' },
    ],
  },
  faction: {
    titre: '🏴 Faction', texte: 'Tu cherches une équipe ou tu recrutes ?', max: 1,
    roles: [
      { nom: 'Cherche Faction', emoji: '🔎', desc: 'Je cherche une faction à rejoindre' },
      { nom: 'Recruteur Faction', emoji: '📣', desc: 'Je dirige une faction et je recrute' },
    ],
  },
  metier: {
    titre: '⚒️ Métiers du serveur', texte: 'Tes métiers sur le serveur Minecraft (/jobs)', max: 4,
    roles: [
      { nom: 'Métier・Mineur', emoji: '⛏️', desc: 'Minerais et profondeurs' },
      { nom: 'Métier・Bûcheron', emoji: '🪓', desc: 'Abattre les arbres' },
      { nom: 'Métier・Fermier', emoji: '🌾', desc: 'Cultures et élevage' },
      { nom: 'Métier・Pêcheur', emoji: '🎣', desc: 'Pêche en mer et en rivière' },
      { nom: 'Métier・Chasseur', emoji: '🏹', desc: 'Traquer les créatures' },
      { nom: 'Métier・Terrassier', emoji: '🪏', desc: 'Creuser terre, sable et gravier' },
      { nom: 'Métier・Bâtisseur', emoji: '🧱', desc: 'Poser des blocs et construire' },
      { nom: 'Métier・Artisan', emoji: '🛠️', desc: 'Fabriquer objets et outils' },
      { nom: 'Métier・Forgeron', emoji: '⚔️', desc: 'Armes et réparations' },
      { nom: 'Métier・Enchanteur', emoji: '✨', desc: 'Enchanter l\'équipement' },
      { nom: 'Métier・Alchimiste', emoji: '⚗️', desc: 'Préparer des potions' },
      { nom: 'Métier・Explorateur', emoji: '🧭', desc: 'Découvrir de nouvelles terres' },
      { nom: 'Métier・Marin', emoji: '⛵', desc: 'Naviguer sur les océans' },
      { nom: 'Métier・Charpentier naval', emoji: '🚢', desc: 'Construire des navires' },
      { nom: 'Métier・Débardeur', emoji: '📦', desc: 'Charger et décharger au port' },
      { nom: 'Métier・Chevalier', emoji: '🛡️', desc: 'Servir l\'Ordre du Temple et protéger les routes' },
    ],
  },
  age: {
    titre: '🎂 Âge', texte: 'Ta tranche d\'âge', max: 1,
    roles: [
      { nom: '-18', emoji: '🧒', desc: 'Moins de 18 ans' },
      { nom: '+18', emoji: '🧑', desc: '18 ans et plus' },
    ],
  },
  region: {
    titre: '🌍 Région', texte: 'D\'où joues-tu ?', max: 1,
    roles: [
      { nom: 'Belgique', emoji: '🇧🇪' },
      { nom: 'France', emoji: '🇫🇷' },
      { nom: 'Suisse', emoji: '🇨🇭' },
      { nom: 'Canada', emoji: '🇨🇦' },
      { nom: 'Autre pays', emoji: '🌐' },
    ],
  },
};
const COULEUR_CHOIX = 0x99aab5;

export const TOUS_LES_ROLES = [
  ...ACCES,
  ...PALIERS,
  ...Object.values(CATEGORIES).flatMap((c) => c.roles.map((r) => ({ nom: r.nom, couleur: COULEUR_CHOIX }))),
];

// Rôles qui existaient déjà sur le serveur sous un autre nom : on les réutilise au lieu d'en créer des doublons.
export const ALIAS = {
  'Notif Annonces': ['🔔・Notif Annonce'],
  'Notif Concours': ['🎁・Notif Giveaway'],
  'Notif Événements': ['🎤・Notif Animation'],
  'Notif Sondages': ['📊・Notif Sondage'],
  'Notif Partenariats': ['🥂 notif partenariats'],
  'Notif Recrutement': ['💼・Notif Recrutement'],
  'Notif YouTube / Live': ['notif youtube / live 🎥'],
  '-18': ['🚼・Mineur'],
  '+18': ['🚻・Majeur'],
};
// Nom sans emoji, sans accent ni majuscule : « 🍸・Membre » = « Membre », « 💎・Vip » = « VIP ».
export const normaliser = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9+-]/gi, '').toLowerCase();
export function trouverRole(roles, nom) {
  const liste = [...roles.values()];
  return liste.find((r) => r.name === nom)
    ?? liste.find((r) => (ALIAS[nom] ?? []).includes(r.name))
    ?? liste.find((r) => !r.managed && normaliser(r.name) === normaliser(nom));
}
const trouver = (guild, nom) => trouverRole(guild.roles.cache, nom);

// Sécurité : un rôle à choisir soi-même ne doit jamais donner de pouvoir de modération.
const DANGEREUX = ['Administrator', 'ManageGuild', 'ManageRoles', 'ManageChannels', 'ManageMessages', 'KickMembers',
  'BanMembers', 'ModerateMembers', 'MentionEveryone', 'ManageWebhooks', 'ManageNicknames', 'MuteMembers', 'MoveMembers', 'DeafenMembers'];
export const roleSur = (role) => !role.managed && !DANGEREUX.some((p) => role.permissions?.has?.(PermissionFlagsBits[p]));

// ---------------------------------------------------------------------------
// Niveaux d'activité
// ---------------------------------------------------------------------------
// XP total pour atteindre le niveau n : 50·n·(n+1). Niveau 1 = 100 XP, 5 = 1 500, 10 = 5 500, 30 = 46 500, 50 = 127 500.
export const xpPour = (n) => 50 * n * (n + 1);
export function niveauDe(xp) {
  let n = 0;
  while (xpPour(n + 1) <= xp) n++;
  return n;
}
export const palierDe = (niveau) => PALIERS.find((p) => niveau >= p.niveau) ?? null;
export const XP_MESSAGE = 20; // une fois par minute maximum
export const XP_VOCAL = 10; // par minute passée en vocal à au moins 2
const PAUSE_MESSAGE = 60_000;

const FICHIER = path.resolve('data', 'niveaux.json');
let donnees = null;
let aSauver = false;
function data() {
  if (!donnees) {
    try { donnees = JSON.parse(fs.readFileSync(FICHIER, 'utf8')); } catch { donnees = {}; }
  }
  return donnees;
}
function sauverPlusTard() { aSauver = true; }
setInterval(() => {
  if (!aSauver) return;
  aSauver = false;
  try {
    fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
    fs.writeFileSync(FICHIER, JSON.stringify(donnees));
  } catch (e) { console.error('Niveaux (sauvegarde) :', e.message); }
}, 30_000).unref();

// Ajoute de l'XP. Renvoie { avant, apres } (niveaux).
export function ajouterXp(userId, nom, gain, d = data(), maintenant = Date.now(), source = 'message') {
  const j = (d[userId] ??= { nom, xp: 0, dernier: 0 });
  j.nom = nom;
  if (source === 'message') {
    if (maintenant - j.dernier < PAUSE_MESSAGE) return null;
    j.dernier = maintenant;
  }
  const avant = niveauDe(j.xp);
  j.xp += gain;
  if (d === donnees) sauverPlusTard();
  return { avant, apres: niveauDe(j.xp) };
}

export function topNiveaux(d = data(), limite = 10) {
  return Object.entries(d).map(([id, j]) => ({ id, ...j, niveau: niveauDe(j.xp) }))
    .sort((a, b) => b.xp - a.xp).slice(0, limite);
}

// Donne le rôle du palier atteint et retire les autres paliers.
async function appliquerPalier(membre, niveau) {
  const p = palierDe(niveau);
  for (const autre of PALIERS) {
    const role = trouver(membre.guild, autre.nom);
    if (!role) continue;
    const doitAvoir = p?.nom === autre.nom || (autre.garder && niveau >= autre.niveau);
    if (doitAvoir && !membre.roles.cache.has(role.id)) await membre.roles.add(role, `Niveau ${niveau}`).catch(() => {});
    if (!doitAvoir && membre.roles.cache.has(role.id)) await membre.roles.remove(role, `Niveau ${niveau}`).catch(() => {});
  }
  return p;
}

// Appelé pour chaque message d'un membre.
export async function xpMessage(message) {
  const r = ajouterXp(message.author.id, message.member?.displayName ?? message.author.username, XP_MESSAGE);
  if (!r || r.apres === r.avant || !message.member) return;
  const p = await appliquerPalier(message.member, r.apres);
  const nouveauPalier = p && palierDe(r.avant)?.nom !== p.nom;
  const texte = nouveauPalier
    ? `🎉 ${message.author} passe **niveau ${r.apres}** et devient **${p.nom}** !`
    : `⬆️ ${message.author} passe **niveau ${r.apres}** !`;
  await message.channel.send({ content: texte, allowedMentions: { users: [] } }).catch(() => {});
}

// Au démarrage : donne les paliers « garder » (Actif) à ceux qui ont déjà le niveau requis.
export async function rattraperPaliers(client, guildId) {
  const guild = client.guilds.cache.get(guildId) ?? await client.guilds.fetch(guildId);
  await guild.roles.fetch();
  let donnes = 0;
  for (const [id, j] of Object.entries(data())) {
    const n = niveauDe(j.xp);
    for (const pal of PALIERS.filter((x) => x.garder && n >= x.niveau)) {
      const role = trouver(guild, pal.nom);
      if (!role) continue;
      const membre = await guild.members.fetch(id).catch(() => null);
      if (membre && !membre.roles.cache.has(role.id)) {
        if (await membre.roles.add(role, `Niveau ${n}`).then(() => true).catch(() => false)) donnes++;
      }
    }
  }
  if (donnes) console.log(`Niveaux : rôle Actif donné à ${donnes} membre(s)`);
}

// Appelé chaque minute : XP pour les membres en vocal (au moins 2 humains, pas en sourdine casque).
export async function xpVocal(client, guildId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return;
  for (const salon of guild.channels.cache.filter((c) => c.isVoiceBased()).values()) {
    if (salon.id === guild.afkChannelId) continue;
    const humains = salon.members.filter((m) => !m.user.bot);
    if (humains.size < 2) continue;
    for (const m of humains.values()) {
      if (m.voice.selfDeaf || m.voice.serverDeaf) continue;
      const r = ajouterXp(m.id, m.displayName, XP_VOCAL, data(), Date.now(), 'vocal');
      if (r && r.apres !== r.avant) await appliquerPalier(m, r.apres);
    }
  }
}

// ---------------------------------------------------------------------------
// Arrivée d'un membre / d'un bot
// ---------------------------------------------------------------------------
export async function arriveeRoles(membre) {
  const role = trouver(membre.guild, membre.user.bot ? 'Bot' : 'Non-vérifié');
  if (role) await membre.roles.add(role, 'Arrivée').catch((e) => console.error('Rôle d\'arrivée :', e.message));
}

// ---------------------------------------------------------------------------
// Commandes
// ---------------------------------------------------------------------------
async function rolesSetup(i) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  await i.guild.roles.fetch();
  const crees = [];
  for (const r of TOUS_LES_ROLES) {
    if (trouver(i.guild, r.nom)) continue;
    await i.guild.roles.create({ name: r.nom, color: r.couleur, hoist: Boolean(r.hoist), permissions: [], reason: `/roles-setup (${i.user.tag})` });
    crees.push(r.nom);
  }
  // Les membres déjà là sont considérés comme vérifiés ; les bots reçoivent le rôle Bot.
  const membres = await i.guild.members.fetch();
  const membre = trouver(i.guild, 'Membre');
  const bot = trouver(i.guild, 'Bot');
  let donnes = 0;
  for (const m of membres.values()) {
    const role = m.user.bot ? bot : membre;
    if (role && !m.roles.cache.has(role.id) && !m.roles.cache.some((x) => x.name === 'Non-vérifié')) {
      if (await m.roles.add(role, '/roles-setup').then(() => true).catch(() => false)) donnes++;
    }
  }
  return i.editReply([
    crees.length ? `🆕 ${crees.length} rôles créés : ${crees.join(', ')}` : '✔️ Tous les rôles existaient déjà.',
    `👥 Rôle Membre/Bot donné à ${donnes} personne(s) déjà sur le serveur.`,
    '',
    '**À faire une fois dans Paramètres du serveur :**',
    '1. **Rôles** : glisse le rôle du bot **au-dessus** de tous ces rôles, sinon il ne peut pas les donner.',
    '2. **Salons** : pour bloquer les nouveaux, retire « Voir le salon » à @everyone et donne-le au rôle **Membre**,',
    '   sauf dans #règlement et #rôles (visibles par tous). Sans ça, le rôle Non-vérifié ne bloque rien.',
    '3. Ensuite : `/reglement` dans #règlement et `/roles-panneau` dans #rôles.',
  ].join('\n'));
}

const REGLES = [
  '1️⃣ Respect de tout le monde : pas d\'insultes, de harcèlement ni de discrimination.',
  '2️⃣ Pas de spam, de pub ou de liens douteux.',
  '3️⃣ Pas de contenu choquant, NSFW ou illégal.',
  '4️⃣ Pas de triche ni de grief sur le serveur Minecraft.',
  '5️⃣ Les décisions du staff s\'appliquent ; en cas de souci, ouvre une discussion calmement.',
  '6️⃣ Respecte les conditions de Discord (13 ans minimum).',
];

async function reglement(i) {
  const embed = new EmbedBuilder().setColor(0x3fae5a).setTitle('📜 Règlement des Naufragés')
    .setDescription(`${REGLES.join('\n')}\n\nClique sur le bouton pour accepter le règlement et débloquer le serveur.`)
    .setFooter({ text: 'Règlement complet : lesnaufrages.net/conditions.html' });
  const bouton = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('reglement:ok').setLabel('J\'accepte le règlement').setEmoji('✅').setStyle(ButtonStyle.Success),
  );
  await i.channel.send({ embeds: [embed], components: [bouton] });
  return i.reply({ content: 'Règlement posté ✅', flags: MessageFlags.Ephemeral });
}

export const menu = (cle) => {
  const c = CATEGORIES[cle];
  return new ActionRowBuilder().addComponents(new StringSelectMenuBuilder()
    .setCustomId(`roles:${cle}`).setPlaceholder(`${c.titre} : ${c.texte}`)
    .setMinValues(0).setMaxValues(c.max)
    .addOptions(c.roles.map((r) => ({ label: r.nom, value: r.nom, emoji: r.emoji, ...(r.desc ? { description: r.desc } : {}) }))));
};

async function rolesPanneau(i) {
  await i.channel.send({
    embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🔔 Choisis tes notifications')
      .setDescription('Tu ne seras mentionné que pour ce qui t\'intéresse. Ouvre le menu, coche, et c\'est fait.\nPour tout retirer : ouvre le menu et décoche tout.')],
    components: [menu('notifs')],
  });
  await i.channel.send({
    embeds: [new EmbedBuilder().setColor(0x3fae5a).setTitle('🪪 Ton profil de joueur')
      .setDescription('Affiche ta plateforme, ta spécialité, ta région… pour trouver des coéquipiers plus facilement.')],
    components: ['plateforme', 'specialite', 'faction', 'age', 'region'].map(menu),
  });
  return i.reply({ content: 'Panneaux de rôles postés ✅', flags: MessageFlags.Ephemeral });
}

async function niveau(i) {
  const cible = i.options.getUser('membre') ?? i.user;
  const j = data()[cible.id];
  const xp = j?.xp ?? 0;
  const n = niveauDe(xp);
  const p = palierDe(n);
  const prochain = [...PALIERS].reverse().find((x) => x.niveau > n);
  const base = xpPour(n);
  const suivant = xpPour(n + 1);
  const pct = Math.floor(((xp - base) / (suivant - base)) * 10);
  return i.reply({
    embeds: [new EmbedBuilder().setColor(0x3498db).setTitle(`📈 Niveau de ${j?.nom ?? cible.username}`)
      .setDescription([
        `**Niveau ${n}**${p ? ` · ${p.nom}` : ''}`,
        `${'🟦'.repeat(pct)}${'⬛'.repeat(10 - pct)} ${xp - base} / ${suivant - base} XP`,
        prochain ? `Prochain rôle : **${prochain.nom}** au niveau ${prochain.niveau}` : '🏆 Rang maximum atteint !',
      ].join('\n'))
      .setFooter({ text: `+${XP_MESSAGE} XP par message (1 fois par minute) · +${XP_VOCAL} XP par minute en vocal` })],
  });
}

async function topNiv(i) {
  const top = topNiveaux();
  const medailles = ['🥇', '🥈', '🥉'];
  const lignes = top.map((j, k) => `${medailles[k] ?? `**${k + 1}.**`} ${j.nom} : niveau **${j.niveau}** (${j.xp} XP)`);
  return i.reply({
    embeds: [new EmbedBuilder().setColor(0x3498db).setTitle('🏆 Les plus actifs')
      .setDescription(lignes.join('\n') || 'Personne pour le moment : discute pour gagner de l\'XP !')],
  });
}

export const actionsRoles = {
  'roles-setup': rolesSetup,
  reglement,
  'roles-panneau': rolesPanneau,
  niveau,
  'top-niveaux': topNiv,
};

// Bouton du règlement et menus de rôles. Renvoie true si l'interaction a été traitée.
export async function interactionRoles(i) {
  const [type, cle] = (i.customId ?? '').split(':');
  if (i.isButton() && type === 'reglement') {
    const membre = trouver(i.guild, 'Membre');
    if (!membre) return i.reply({ content: 'Le rôle Membre n\'existe pas encore : un admin doit taper `/roles-setup`.', flags: MessageFlags.Ephemeral }).then(() => true);
    const nonVerif = trouver(i.guild, 'Non-vérifié');
    if (nonVerif && i.member.roles.cache.has(nonVerif.id)) await i.member.roles.remove(nonVerif, 'Règlement accepté');
    if (i.member.roles.cache.has(membre.id)) {
      await i.reply({ content: 'Tu as déjà accepté le règlement 👍', flags: MessageFlags.Ephemeral });
    } else {
      await i.member.roles.add(membre, 'Règlement accepté');
      await i.reply({ content: '✅ Bienvenue à bord ! Tu as maintenant accès au serveur. Choisis tes rôles dans #rôles 😉', flags: MessageFlags.Ephemeral });
    }
    return true;
  }
  if (i.isStringSelectMenu() && type === 'roles' && CATEGORIES[cle]) {
    const choix = new Set(i.values);
    const ajoutes = [];
    const retires = [];
    const manquants = [];
    for (const r of CATEGORIES[cle].roles) {
      const role = trouver(i.guild, r.nom);
      if (!role || !roleSur(role)) { if (choix.has(r.nom)) manquants.push(r.nom); continue; }
      const a = i.member.roles.cache.has(role.id);
      if (choix.has(r.nom) && !a) { await i.member.roles.add(role, 'Menu des rôles'); ajoutes.push(r.nom); }
      if (!choix.has(r.nom) && a) { await i.member.roles.remove(role, 'Menu des rôles'); retires.push(r.nom); }
    }
    const lignes = [];
    if (ajoutes.length) lignes.push(`✅ Ajouté : ${ajoutes.join(', ')}`);
    if (retires.length) lignes.push(`➖ Retiré : ${retires.join(', ')}`);
    if (manquants.length) lignes.push(`⚠️ Rôle introuvable : ${manquants.join(', ')} (un admin doit taper \`/roles-setup\`)`);
    await i.reply({ content: lignes.join('\n') || 'Rien n\'a changé 👍', flags: MessageFlags.Ephemeral });
    return true;
  }
  return false;
}
