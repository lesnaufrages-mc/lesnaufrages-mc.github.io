import fs from 'node:fs';
import {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} from 'discord.js';
import { config, verifierConfig, LIEN_JEU, LIEN_DISCORD } from './config.js';
import { commandes } from './commandes.js';
import { dayNumber, heureParis, parseScore, MAX_TRIES } from './motdujour.js';
import { enregistrer, classement } from './scores.js';
import { actionsStaff, interactionStaff } from './staff.js';
import { verifierActus, commandeActus } from './actus.js';
import { verifierMinecraft, commandeServeur } from './minecraft.js';
import { commandeMaintenance, SALON_MC } from './annonces-mc.js';
import { verifierRapport, commandeChangelog, commandeRapport } from './rapport.js';
import { actionsRoles, interactionRoles, arriveeRoles, xpMessage, xpVocal, rattraperPaliers } from './roles.js';
import { creerRolesMinecraft, commandeRolesMinecraft } from './grades-mc.js';
import { creerSalonsMinecraft } from './salons-mc.js';
import { ajouterSons, remercierBoost, majProfilBot } from './extras.js';
import { preparerVotes, commandeVote } from './votes.js';
import { brancherGuard, commandeGuard } from './guard.js';
import { brancherAntipub, commandeAvertissements } from './antipub.js';
import { actionsAbsences, interactionAbsences, verifierAbsences } from './absences.js';
import { rangerBots } from './bots.js';
import { rangerToutesLesCategories, surveillerNouveauxBots } from './rangement.js';
import { appliquerAccueil, reparerTachesAccueil } from './accueil.js';
import { creerFactionStaff } from './faction-staff.js';
import { preparerVocaux, brancherVocaux } from './vocaux.js';
import { verifierTwitch } from './twitch.js';
import { commandeTraduction } from './traduction.js';
import { donnerSeparateurs, surveillerSeparateurs } from './separateurs-membres.js';
import { verifierTags, changementUtilisateur, verifierAnniversaires, rappelVote, promotions, palierBoost, actionsCommunaute } from './communaute.js';
import { actionsTournoi, interactionTournoi } from './tournois.js';
import { preparerCroissance, verifierConcours, arriveeInvitation, departInvitation, messageBump, actionsCroissance } from './croissance.js';

verifierConfig();

const VERT = 0x3fae5a;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // pour voir les nouveaux arrivants
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // pour lire les résultats collés du Mot Mystère
    GatewayIntentBits.GuildVoiceStates, // pour l'XP en vocal (niveaux)
    GatewayIntentBits.GuildModeration, // garde anti-nuke : journal d'audit et bannissements
    GatewayIntentBits.GuildInvites, // suivi des invitations (qui a invité qui)
  ],
});

const boutonJouer = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setLabel('🎮 Jouer au Mot Mystère').setStyle(ButtonStyle.Link).setURL(LIEN_JEU),
);

// --- Démarrage : on enregistre les commandes "/" sur le serveur et on lance le rappel quotidien ---
client.once(Events.ClientReady, async (c) => {
  const guild = await c.guilds.fetch(config.guildId);
  await guild.commands.set(commandes);
  console.log(`✅ Connecté en tant que ${c.user.tag} sur « ${guild.name} »`);
  // Liste des rôles et salons (noms + identifiants) dans data/ids.json : pratique pour configurer
  // d'autres outils (DiscordSRV...) sans devoir copier les identifiants un par un.
  const ecrireIds = async () => {
    const roles = await guild.roles.fetch();
    const salons = await guild.channels.fetch();
    const ids = {
      roles: Object.fromEntries([...roles.values()].map((r) => [r.name, r.id])),
      ordreRoles: [...roles.values()].sort((a, b) => b.position - a.position).map((r) => ({ id: r.id, nom: r.name, pos: r.position, membres: r.members.size, perms: r.permissions.bitfield.toString(), gere: r.managed, couleur: r.hexColor, affiche: r.hoist })),
      salons: Object.fromEntries([...salons.values()].filter(Boolean).map((x) => [x.name, x.id])),
    };
    fs.mkdirSync('data', { recursive: true });
    fs.writeFileSync('data/ids.json', JSON.stringify(ids, null, 2));
  };
  // Salon #chat-minecraft (pont avec le chat du jeu via DiscordSRV) : créé une fois, à côté du salon d'état.
  try {
    const salons = await guild.channels.fetch();
    if (!salons.find((x) => x?.name === 'chat-minecraft')) {
      const voisin = salons.get(process.env.SALON_MINECRAFT_ID || '1017711078752407622');
      await guild.channels.create({ name: 'chat-minecraft', topic: '💬 Chat du serveur Minecraft en direct (naufragesmc.mine.fun)', parent: voisin?.parentId ?? null, reason: 'Pont DiscordSRV' });
      console.log('Salon #chat-minecraft créé');
    }
  } catch (e) { console.error('chat-minecraft :', e.message); }
  // Rôles Discord des grades du serveur Minecraft (pour DiscordSRV) : créés s'ils manquent.
  await creerRolesMinecraft(guild).catch((e) => console.error('Grades Minecraft :', e.message));
  await creerSalonsMinecraft(guild).catch((e) => console.error('Salons Minecraft :', e.message));
  await ajouterSons(guild).catch((e) => console.error('Soundboard :', e.message));
  await majProfilBot(c).catch((e) => console.error('Profil :', e.message));
  await preparerVotes(guild).catch((e) => console.error('Votes :', e.message));
  await preparerCroissance(c, guild).catch((e) => console.error('Invitations :', e.message));
  setTimeout(() => rangerBots(guild).catch((e) => console.error('Bots :', e.message)), 90_000); // après les autres chargements de membres (limite Discord)
  setInterval(() => rangerBots(guild).catch(() => {}), 60 * 60_000);
  // Rangement des rôles par catégories (séparateurs) : 2 min 30 après le démarrage puis toutes les 24 h.
  setTimeout(() => rangerToutesLesCategories(guild).catch((e) => console.error('Rangement :', e.message)), 150_000);
  surveillerNouveauxBots(client, guild);
  surveillerSeparateurs(client, guild);
  setTimeout(() => donnerSeparateurs(guild).catch((e) => console.error('Séparateurs :', e.message)), 200_000);
  setInterval(() => donnerSeparateurs(guild).catch(() => {}), 6 * 3600_000);
  setInterval(() => verifierTwitch(client).catch(() => {}), 2 * 60_000);
  setTimeout(() => appliquerAccueil(guild).catch((e) => console.error('Accueil :', e.message)), 60_000);
  setTimeout(() => reparerTachesAccueil(guild).catch((e) => console.error('Tâches accueil :', e.message)), 75_000);
  setTimeout(() => creerFactionStaff(guild).catch((e) => console.error('Faction Staff :', e.message)), 20_000);
  setTimeout(() => preparerVocaux(guild).catch((e) => console.error('Vocaux :', e.message)), 30_000);
  setInterval(() => rangerToutesLesCategories(guild).catch((e) => console.error('Rangement :', e.message)), 24 * 3600_000);
  // Tag du serveur (rôle Supporter) : 2 min après le démarrage puis toutes les 6 h ; anniversaires chaque minute (annonce à 9 h).
  setTimeout(() => verifierTags(guild).catch((e) => console.error('Tags :', e.message)), 120_000);
  setInterval(() => verifierTags(guild).catch((e) => console.error('Tags :', e.message)), 6 * 3600_000);
  setInterval(() => verifierAnniversaires(guild).catch((e) => console.error('Anniversaires :', e.message)), 60_000);
  setInterval(() => verifierConcours(c).catch((e) => console.error('Concours :', e.message)), 60_000);
  setInterval(() => rappelVote(guild).catch((e) => console.error('Rappel vote :', e.message)), 60_000);
  c.on(Events.UserUpdate, (a, n) => changementUtilisateur(a, n, guild).catch(() => {}));
  c.on(Events.GuildUpdate, (a, n) => { if (n.id === guild.id) palierBoost(a, n).catch(() => {}); });
  setInterval(() => preparerVotes(guild).catch(() => {}), 5 * 60_000);
  rattraperPaliers(c, config.guildId).catch((e) => console.error('Paliers :', e.message));
  ecrireIds().catch((e) => console.error('ids.json :', e.message));
  setInterval(() => ecrireIds().catch(() => {}), 10 * 60_000);
  c.user.setActivity(`Mot Mystère #${dayNumber()}`);
  setInterval(verifierRappel, 60_000);
  // Actus du site : vérifiées toutes les 5 minutes.
  setInterval(() => verifierActus(c, config.salonActus, SALON_MC), 5 * 60_000);
  verifierActus(c, config.salonActus, SALON_MC);
  // État du serveur Minecraft : vérifié chaque minute.
  setInterval(() => verifierMinecraft(c), 60_000);
  verifierMinecraft(c);
  // Rapport hebdomadaire du serveur Minecraft : le lundi à 9 h (vérifié chaque minute).
  setInterval(() => verifierRapport(c), 60_000);
  setTimeout(() => verifierRapport(c), 15_000);
  // Niveaux : XP pour le temps passé en vocal, chaque minute.
  setInterval(() => xpVocal(c, config.guildId).catch((e) => console.error('XP vocal :', e.message)), 60_000);
  // Absences du staff : rôle « En absence » mis et retiré à l'heure, chaque minute.
  setInterval(() => verifierAbsences(c, config.guildId).catch((e) => console.error('Absences :', e.message)), 60_000);
  setTimeout(() => verifierAbsences(c, config.guildId).catch((e) => console.error('Absences :', e.message)), 20_000);
  verifierRappel();
});

// --- Bienvenue + rôle automatique ---
client.on(Events.GuildMemberAdd, async (membre) => {
  await arriveeRoles(membre);
  if (membre.user.bot) return;
  const invitation = await arriveeInvitation(membre).catch((e) => { console.error('Invitation :', e.message); return null; });
  if (config.roleArrivant) {
    await membre.roles.add(config.roleArrivant).catch((e) => console.error('Rôle arrivant :', e.message));
  }
  if (!config.salonBienvenue) return;
  const salon = await membre.guild.channels.fetch(config.salonBienvenue).catch(() => null);
  if (!salon) return;
  const embed = new EmbedBuilder()
    .setColor(VERT)
    .setTitle(`🏝️ Bienvenue chez Les Naufragés, ${membre.user.username} !`)
    .setDescription(
      `Content de te voir parmi nous, ${membre} ! Tu es notre **${membre.guild.memberCount}ᵉ** naufragé.\n\n`
      + '⛏️ Lis le règlement et viens jouer avec nous sur le serveur Minecraft.\n'
      + `🧩 Chaque jour, un nouveau **Mot Mystère** à deviner : colle ton résultat ici pour grimper au \`/classement\` !`
      + (invitation ? `\n\n${invitation}` : ''),
    )
    .setThumbnail(membre.user.displayAvatarURL());
  await salon.send({ embeds: [embed], components: [boutonJouer()] });
});

// --- Scores : quelqu'un colle "Mot Mystère #3 4/6 ..." dans n'importe quel salon ---
client.on(Events.GuildMemberRemove, (membre) => departInvitation(membre));

client.on(Events.MessageCreate, async (message) => {
  if (message.guild && message.author.bot) messageBump(message).catch((e) => console.error('Bump :', e.message));
  if (message.author.bot || !message.guild) return;
  xpMessage(message).catch((e) => console.error('XP :', e.message));
  const score = parseScore(message.content);
  if (!score) return;
  if (score.day !== dayNumber()) {
    await message.react('⌛');
    return; // seuls les résultats du jour comptent
  }
  const nouveau = enregistrer(message.author.id, message.member?.displayName ?? message.author.username, score.day, score.tries);
  await message.react(nouveau ? (score.tries ? '✅' : '💀') : '🔁');
});

// --- Commandes "/" et boutons ---
client.on(Events.InteractionCreate, async (i) => {
  try {
    if (i.isButton() && i.customId === 'role-notif') return await basculerRoleNotif(i);
    if (await interactionStaff(i)) return;
    if (await interactionRoles(i)) return;
    if (await interactionAbsences(i)) return;
    if (await interactionTournoi(i)) return;
    if (!i.isChatInputCommand()) return;
    const action = actions[i.commandName] ?? actionsStaff[i.commandName] ?? actionsRoles[i.commandName] ?? actionsAbsences[i.commandName] ?? actionsCroissance[i.commandName] ?? actionsCommunaute[i.commandName] ?? actionsTournoi[i.commandName] ?? ({ 'ranger-roles': async (x) => { await x.deferReply({ flags: MessageFlags.Ephemeral }); const r = await rangerToutesLesCategories(x.guild); await x.editReply(`🗂️ Rangement : ${r.bouges ?? 0} rôle(s) déplacé(s)${r.erreurs?.length ? `, erreurs : ${r.erreurs.join(' | ').slice(0, 1500)}` : ''}${r.message ? ` (${r.message})` : ''}`); } })[i.commandName] ?? ({ actus: commandeActus, serveur: commandeServeur, changelog: commandeChangelog, rapport: commandeRapport, maintenance: commandeMaintenance, 'roles-minecraft': commandeRolesMinecraft, vote: commandeVote, guard: commandeGuard, avertissements: commandeAvertissements, traduction: commandeTraduction })[i.commandName];
    if (action) await action(i);
  } catch (e) {
    console.error(e);
    const reponse = { content: '😵 Oups, une erreur est arrivée.', flags: MessageFlags.Ephemeral };
    if (i.replied || i.deferred) await i.followUp(reponse).catch(() => {});
    else await i.reply(reponse).catch(() => {});
  }
});

const actions = {
  aide: (i) => i.reply({
    flags: MessageFlags.Ephemeral,
    content: [
      '**Commandes du bot**',
      '`/jouer` : lien du jeu Mot Mystère',
      '`/motdujour` : numéro du mot du jour',
      '`/classement` : top 10 des joueurs',
      "`/mon-lien` : ton lien perso pour inviter tes potes (XP + rôles) · `/invitations` · `/top-invitations`",
      '`/serveur` : état du serveur Minecraft (en ligne, joueurs, adresse)',
      '`/traduction demarrer` : traduction en direct de ton salon vocal (fr, en, es…)',
      '`/niveau` : ton niveau d\'activité · `/top-niveaux` : les plus actifs',
      '',
      '`/staff` : qui fait partie du staff',
      '`/candidature` : postuler pour rejoindre le staff',
      '',
      '**Modération** : `/clear`, `/mute`, `/roles`, `/avertissements` (anti-pub : liens d\'autres serveurs effacés + avertissement)',
      '**Staff** : `/staff-setup` (crée les rôles), `/recrutement` (ouvre les candidatures), `/actus` (poste la dernière actu du site)',
      '**Garde anti-nuke** : `/guard statut` (permissions, salon des rapports), `/guard confiance`, `/guard activer` (propriétaire seulement)',
      '**Absences du staff** : `/absences-setup` (poste le panneau), `/absences planning`, `/absences declarer-pour`',
      '**Rapport du lundi** : `/changelog ajouter` (noter un changement du serveur), `/changelog voir`, `/rapport` (aperçu ou publication), `/maintenance` (annoncer une maintenance)',
      '**Rôles** : `/roles-setup` (crée les rôles), `/reglement` (bouton J\'accepte), `/roles-panneau` (menus de rôles), `/roles-minecraft` (rôles des grades du serveur MC)',
      '',
      '💡 Colle ton résultat du Mot Mystère dans un salon : le bot le compte tout seul.',
    ].join('\n'),
  }),

  jouer: (i) => i.reply({ content: 'Prêt à trouver le mot ? 🧩', components: [boutonJouer()] }),

  motdujour: (i) => i.reply({
    embeds: [new EmbedBuilder().setColor(VERT).setTitle(`🧩 Mot Mystère #${dayNumber()}`)
      .setDescription(`Un mot de 5 lettres, ${MAX_TRIES} essais. Pas de spoil dans les salons ! 🤫`)],
    components: [boutonJouer()],
  }),

  classement: (i) => {
    const top = classement();
    const medailles = ['🥇', '🥈', '🥉'];
    const lignes = top.map((j, n) => `${medailles[n] ?? `**${n + 1}.**`} ${j.nom} : **${j.points} pts** (${j.victoires}/${j.parties} gagnés)`);
    return i.reply({
      embeds: [new EmbedBuilder().setColor(VERT).setTitle('🏆 Classement Mot Mystère')
        .setDescription(lignes.join('\n') || 'Personne pour le moment. Colle ton résultat du jour pour être le premier !')
        .setFooter({ text: '1 essai = 6 pts … 6 essais = 1 pt' })],
    });
  },

  invitation: (i) => i.reply(`Invite tes potes chez Les Naufragés 🏝️ ${LIEN_DISCORD}`),

  roles: async (i) => {
    if (!config.roleNotif) {
      return i.reply({ content: 'Ajoute ROLE_NOTIF_ID dans le fichier .env puis relance le bot.', flags: MessageFlags.Ephemeral });
    }
    const bouton = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('role-notif').setLabel('🔔 Mot du jour').setStyle(ButtonStyle.Primary),
    );
    await i.channel.send({ content: 'Clique pour recevoir (ou ne plus recevoir) le rappel du **Mot Mystère** chaque jour :', components: [bouton] });
    return i.reply({ content: 'Bouton posté ✅', flags: MessageFlags.Ephemeral });
  },

  clear: async (i) => {
    const supprimes = await i.channel.bulkDelete(i.options.getInteger('nombre'), true);
    return i.reply({ content: `🧹 ${supprimes.size} message(s) supprimé(s).`, flags: MessageFlags.Ephemeral });
  },

  mute: async (i) => {
    const membre = i.options.getMember('membre');
    const minutes = i.options.getInteger('minutes');
    const raison = i.options.getString('raison') ?? 'Aucune raison donnée';
    if (!membre?.moderatable) {
      return i.reply({ content: "Je ne peux pas mute ce membre (son rôle est peut-être au-dessus du mien).", flags: MessageFlags.Ephemeral });
    }
    await membre.timeout(minutes * 60_000, raison);
    return i.reply(`🔇 ${membre} est mute pendant ${minutes} min. Raison : ${raison}`);
  },
};

async function basculerRoleNotif(i) {
  const membre = i.member;
  const aLeRole = membre.roles.cache.has(config.roleNotif);
  if (aLeRole) await membre.roles.remove(config.roleNotif);
  else await membre.roles.add(config.roleNotif);
  return i.reply({ content: aLeRole ? '🔕 Tu ne recevras plus le rappel.' : '🔔 Tu recevras le rappel du mot du jour !', flags: MessageFlags.Ephemeral });
}

// --- Rappel quotidien du mot du jour, une fois par jour à l'heure choisie ---
let dernierRappel = null;
async function verifierRappel() {
  const jour = dayNumber();
  if (!config.salonMotDuJour || heureParis() !== config.rappelHeure || dernierRappel === jour) return;
  dernierRappel = jour;
  client.user.setActivity(`Mot Mystère #${jour}`);
  const salon = await client.channels.fetch(config.salonMotDuJour).catch(() => null);
  if (!salon) return console.error('Salon du mot du jour introuvable : vérifie SALON_MOT_DU_JOUR_ID.');
  await salon.send({
    content: `${config.roleNotif ? `<@&${config.roleNotif}> ` : ''}🧩 **Le Mot Mystère #${jour} est arrivé !** Trouve-le en ${MAX_TRIES} essais et colle ton résultat ici 👇`,
    components: [boutonJouer()],
  });
}

brancherGuard(client);
brancherAntipub(client);
brancherVocaux(client);
client.login(config.token);

// Remerciement automatique dans #boost à chaque nouveau boost.
client.on(Events.GuildMemberUpdate, (ancien, nouveau) => {
  remercierBoost(ancien, nouveau).catch(() => {});
  promotions(ancien, nouveau).catch((e) => console.error('Promotions :', e.message));
});
