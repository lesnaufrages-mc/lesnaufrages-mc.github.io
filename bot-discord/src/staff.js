import fs from 'node:fs';
import path from 'node:path';
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder,
  TextInputStyle, PermissionFlagsBits,
} from 'discord.js';

// Mêmes noms de grades que sur le site (page /staff/). Du plus haut au plus bas.
// Le bot ne peut donner que des permissions qu'il a lui-même : les grades du haut
// sont créés sans permission spéciale, à régler à la main dans les paramètres du serveur.
export const GRADES = [
  { nom: 'Fondateur', emoji: '👑', couleur: 0xe74c3c, postulable: false },
  { nom: 'Admin', emoji: '🛠️', couleur: 0xe67e22, postulable: false },
  { nom: 'Responsable', emoji: '⭐', couleur: 0xf1c40f, postulable: false },
  { nom: 'Modo', emoji: '🛡️', couleur: 0x3498db, postulable: true, permissions: ['ManageMessages', 'ModerateMembers'] },
  { nom: 'Helper', emoji: '🤝', couleur: 0x1abc9c, postulable: true, permissions: ['ManageMessages'] },
  { nom: 'Builder', emoji: '🏗️', couleur: 0x9b59b6, postulable: true },
  { nom: 'Dev', emoji: '💻', couleur: 0x2ecc71, postulable: true },
  { nom: 'Animateur', emoji: '🎉', couleur: 0xe91e63, postulable: true },
];
export const POSTES = GRADES.filter((g) => g.postulable);
export const STAFF_DECIDEUR = ['Fondateur', 'Admin', 'Responsable'];

export const grade = (nom) => GRADES.find((g) => g.nom === nom);
export const estPoste = (nom) => POSTES.some((g) => g.nom === nom);

// --- Petits fichiers de sauvegarde dans data/ (jamais envoyés sur GitHub) ---
function lire(nom) {
  try {
    return JSON.parse(fs.readFileSync(path.resolve('data', nom), 'utf8'));
  } catch {
    return {};
  }
}
function ecrire(nom, data) {
  fs.mkdirSync(path.resolve('data'), { recursive: true });
  fs.writeFileSync(path.resolve('data', nom), JSON.stringify(data, null, 2));
}

// Un candidat ne peut avoir qu'une candidature en attente à la fois
// (au bout de 7 jours sans réponse, il peut repostuler).
const SEPT_JOURS = 7 * 86400000;
export const enAttente = (userId, data = lire('candidatures.json'), maintenant = Date.now()) => Boolean(data[userId])
  && maintenant - Date.parse(data[userId].date) < SEPT_JOURS;
export function ouvrirCandidature(userId, poste, data = lire('candidatures.json'), sauver = (d) => ecrire('candidatures.json', d)) {
  if (enAttente(userId, data)) return false;
  data[userId] = { poste, date: new Date().toISOString() };
  sauver(data);
  return true;
}
export function fermerCandidature(userId, data = lire('candidatures.json'), sauver = (d) => ecrire('candidatures.json', d)) {
  delete data[userId];
  sauver(data);
}

// --- /staff-setup : crée les rôles qui manquent ---
async function creerRoles(i) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const roles = await i.guild.roles.fetch();
  const lignes = [];
  for (const g of GRADES) {
    if (roles.find((r) => r.name === g.nom)) {
      lignes.push(`✔️ ${g.emoji} ${g.nom} existait déjà`);
      continue;
    }
    await i.guild.roles.create({
      name: g.nom, color: g.couleur, hoist: true, mentionable: true,
      permissions: (g.permissions ?? []).map((p) => PermissionFlagsBits[p]),
      reason: `Grade staff créé par /staff-setup (${i.user.tag})`,
    });
    lignes.push(`🆕 ${g.emoji} ${g.nom} créé`);
  }
  lignes.push('', '⚠️ Fondateur, Admin et Responsable sont créés **sans permission** : règle-les dans Paramètres du serveur > Rôles.',
    'Garde le rôle du bot **au-dessus** de tous ces rôles pour qu\'il puisse les donner.');
  return i.editReply(lignes.join('\n'));
}

// --- /recrutement : poste le message avec les boutons « Postuler » ---
const boutonsPostuler = () => new ActionRowBuilder().addComponents(
  POSTES.map((g) => new ButtonBuilder().setCustomId(`postuler:${g.nom}`).setLabel(g.nom).setEmoji(g.emoji).setStyle(ButtonStyle.Primary)),
);

async function posterRecrutement(i) {
  const salon = i.options.getChannel('salon_candidatures');
  ecrire('reglages.json', { ...lire('reglages.json'), salonCandidatures: salon.id });
  const embed = new EmbedBuilder()
    .setColor(0x3fae5a)
    .setTitle('📋 Recrutement du staff des Naufragés')
    .setDescription(
      'Tu veux aider la communauté ? Choisis le poste qui te correspond et remplis le formulaire.\n\n'
      + POSTES.map((g) => `${g.emoji} **${g.nom}**`).join('\n')
      + '\n\nLe staff étudie chaque candidature et te répond en message privé. Bonne chance ! 🍀',
    );
  await i.channel.send({ embeds: [embed], components: [boutonsPostuler()] });
  return i.reply({ content: `Message de recrutement posté ✅ Les candidatures arriveront dans ${salon}.`, flags: MessageFlags.Ephemeral });
}

// --- Formulaire de candidature (5 questions max imposées par Discord) ---
function formulaire(poste) {
  const champ = (id, label, style, max, placeholder) => new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setMaxLength(max).setRequired(true).setPlaceholder(placeholder),
  );
  return new ModalBuilder()
    .setCustomId(`candidature:${poste}`)
    .setTitle(`Candidature ${poste}`)
    .addComponents(
      champ('pseudo', 'Ton pseudo Minecraft', TextInputStyle.Short, 32, 'Steve'),
      champ('age', 'Ton âge', TextInputStyle.Short, 3, '16'),
      champ('dispo', 'Tes disponibilités', TextInputStyle.Short, 100, 'Le soir et le week-end'),
      champ('experience', 'Ton expérience (staff, serveurs...)', TextInputStyle.Paragraph, 1000, 'J\'ai déjà été modo sur...'),
      champ('motivation', 'Pourquoi toi ?', TextInputStyle.Paragraph, 1000, 'Je veux rejoindre le staff parce que...'),
    );
}

async function ouvrirFormulaire(i, poste) {
  if (!estPoste(poste)) return i.reply({ content: 'Ce poste n\'existe pas.', flags: MessageFlags.Ephemeral });
  if (!lire('reglages.json').salonCandidatures) {
    return i.reply({ content: 'Le recrutement n\'est pas encore ouvert (un admin doit faire `/recrutement`).', flags: MessageFlags.Ephemeral });
  }
  if (enAttente(i.user.id)) {
    return i.reply({ content: '⏳ Tu as déjà une candidature en attente. Patiente, le staff va te répondre !', flags: MessageFlags.Ephemeral });
  }
  return i.showModal(formulaire(poste));
}

async function recevoirFormulaire(i, poste) {
  const salon = await i.client.channels.fetch(lire('reglages.json').salonCandidatures).catch(() => null);
  if (!salon) return i.reply({ content: '😵 Salon des candidatures introuvable, préviens un admin.', flags: MessageFlags.Ephemeral });
  if (!ouvrirCandidature(i.user.id, poste)) {
    return i.reply({ content: '⏳ Tu as déjà une candidature en attente.', flags: MessageFlags.Ephemeral });
  }
  const r = (id) => i.fields.getTextInputValue(id);
  const embed = new EmbedBuilder()
    .setColor(grade(poste).couleur)
    .setTitle(`${grade(poste).emoji} Candidature ${poste}`)
    .setAuthor({ name: i.user.tag, iconURL: i.user.displayAvatarURL() })
    .setDescription(`Candidat : ${i.user}`)
    .addFields(
      { name: 'Pseudo Minecraft', value: r('pseudo'), inline: true },
      { name: 'Âge', value: r('age'), inline: true },
      { name: 'Disponibilités', value: r('dispo') },
      { name: 'Expérience', value: r('experience') },
      { name: 'Motivation', value: r('motivation') },
    )
    .setTimestamp();
  const boutons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cand-oui:${i.user.id}:${poste}`).setLabel('Accepter').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`cand-non:${i.user.id}:${poste}`).setLabel('Refuser').setEmoji('❌').setStyle(ButtonStyle.Danger),
  );
  await salon.send({ embeds: [embed], components: [boutons] });
  return i.reply({ content: '📨 Candidature envoyée ! Le staff te répondra en message privé.', flags: MessageFlags.Ephemeral });
}

// --- Boutons Accepter / Refuser (réservés à Fondateur, Admin, Responsable ou « Gérer les rôles ») ---
const peutDecider = (membre) => membre.permissions.has(PermissionFlagsBits.ManageRoles)
  || membre.roles.cache.some((r) => STAFF_DECIDEUR.includes(r.name));

async function decider(i, accepte, userId, poste) {
  if (!peutDecider(i.member)) return i.reply({ content: '🚫 Seuls les responsables du staff peuvent décider.', flags: MessageFlags.Ephemeral });
  await i.deferUpdate();
  fermerCandidature(userId);
  const candidat = await i.guild.members.fetch(userId).catch(() => null);
  let note = '';
  if (accepte && candidat) {
    const role = (await i.guild.roles.fetch()).find((r) => r.name === poste);
    if (!role) note = `\n⚠️ Rôle « ${poste} » introuvable : fais \`/staff-setup\`.`;
    else await candidat.roles.add(role).catch(() => { note = '\n⚠️ Je n\'ai pas pu donner le rôle (mon rôle doit être au-dessus).'; });
  }
  if (candidat) {
    const mp = accepte
      ? `🎉 Bonne nouvelle ! Ta candidature **${poste}** chez Les Naufragés a été **acceptée**. Bienvenue dans le staff !`
      : `Merci pour ta candidature **${poste}** chez Les Naufragés. Elle n'a pas été retenue cette fois, mais tu pourras retenter plus tard 💪`;
    await candidat.send(mp).catch(() => { note += '\n(MP impossible : le candidat les a bloqués.)'; });
  } else note += '\n(Le candidat a quitté le serveur.)';
  const embed = EmbedBuilder.from(i.message.embeds[0])
    .setColor(accepte ? 0x2ecc71 : 0x7f8c8d)
    .setFooter({ text: `${accepte ? '✅ Acceptée' : '❌ Refusée'} par ${i.user.tag}` });
  return i.editReply({ content: note || null, embeds: [embed], components: [] });
}

// --- /staff : liste des membres du staff ---
async function listerStaff(i) {
  await i.deferReply();
  await i.guild.members.fetch();
  const roles = await i.guild.roles.fetch();
  const lignes = GRADES.map((g) => {
    const role = roles.find((r) => r.name === g.nom);
    const membres = role ? [...role.members.values()].map((m) => m.displayName).join(', ') : '';
    return `${g.emoji} **${g.nom}** : ${membres || '_personne_'}`;
  });
  return i.editReply({ embeds: [new EmbedBuilder().setColor(0x3fae5a).setTitle('🏝️ Le staff des Naufragés').setDescription(lignes.join('\n'))] });
}

export const actionsStaff = {
  'staff-setup': creerRoles,
  recrutement: posterRecrutement,
  candidature: (i) => ouvrirFormulaire(i, i.options.getString('poste')),
  staff: listerStaff,
};

// Gère les boutons et formulaires du recrutement. Renvoie true si l'interaction a été traitée.
export async function interactionStaff(i) {
  const [type, a, b] = (i.customId ?? '').split(':');
  if (i.isButton() && type === 'postuler') await ouvrirFormulaire(i, a);
  else if (i.isModalSubmit() && type === 'candidature') await recevoirFormulaire(i, a);
  else if (i.isButton() && (type === 'cand-oui' || type === 'cand-non')) await decider(i, type === 'cand-oui', a, b);
  else return false;
  return true;
}
