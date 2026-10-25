import {
  Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags,
} from 'discord.js';
import { config, verifierConfig, LIEN_JEU, LIEN_DISCORD } from './config.js';
import { commandes } from './commandes.js';
import { dayNumber, heureParis, parseScore, MAX_TRIES } from './motdujour.js';
import { enregistrer, classement } from './scores.js';

verifierConfig();

const VERT = 0x3fae5a;
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers, // pour voir les nouveaux arrivants
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // pour lire les résultats collés du Mot Mystère
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
  c.user.setActivity(`Mot Mystère #${dayNumber()}`);
  setInterval(verifierRappel, 60_000);
  verifierRappel();
});

// --- Bienvenue + rôle automatique ---
client.on(Events.GuildMemberAdd, async (membre) => {
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
      + `🧩 Chaque jour, un nouveau **Mot Mystère** à deviner : colle ton résultat ici pour grimper au \`/classement\` !`,
    )
    .setThumbnail(membre.user.displayAvatarURL());
  await salon.send({ embeds: [embed], components: [boutonJouer()] });
});

// --- Scores : quelqu'un colle "Mot Mystère #3 4/6 ..." dans n'importe quel salon ---
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot || !message.guild) return;
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
    if (!i.isChatInputCommand()) return;
    const action = actions[i.commandName];
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
      "`/invitation` : lien pour inviter tes potes",
      '',
      '**Modération** : `/clear`, `/mute`, `/roles`',
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

client.login(config.token);
