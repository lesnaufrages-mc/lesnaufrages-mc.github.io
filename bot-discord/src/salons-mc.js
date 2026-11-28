import fs from 'node:fs';
import path from 'node:path';
import { ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

// Catégorie « Serveur Minecraft » : créée une seule fois au démarrage s'il manque des salons.
// Les salons sont retrouvés par nom ; data/salons-mc.json garde leurs identifiants.
const CATEGORIE = '⛏️ SERVEUR MINECRAFT';
export const SALONS_MC = [
  {
    nom: '📘・guides-et-commandes', lecture: true, sujet: 'Guides, commandes et infos utiles du serveur Minecraft',
    titre: '📘 Guides et commandes',
    texte: 'Retrouvez ici les guides du serveur Minecraft.\n\n🎮 Adresse : `naufragesmc.mine.fun` (Java et Bedrock)\n❓ En jeu : `/aide`, `/menu` et `/warp` pour vous repérer\n⚒️ Métiers : `/jobs browse`\n🏴 Factions : `/f help`\n🏪 Hôtel des ventes : `/hdv`\n📜 Règlement : <#828255180214632509>',
    pdf: { nom: 'Guide-factions-Les-Naufrages.pdf', b64: 'data/guide-factions.b64' },
  },
  {
    nom: '📅・événements-mc', lecture: true, sujet: 'Événements, tournois et animations du serveur Minecraft',
    titre: '📅 Événements du serveur',
    texte: 'Les événements du serveur Minecraft sont annoncés ici : tournois, chasses au trésor, concours de construction et soirées du samedi.\n\nActivez le rôle **Notif Événements** dans <#883685703035285526> pour être prévenu.',
  },
  {
    nom: '🏴・factions', sujet: 'Recrutement de factions, alliances et diplomatie',
    titre: '🏴 Factions',
    texte: 'Présentez votre faction, recrutez de nouveaux membres et négociez vos alliances.\n\n• Une présentation par faction : nom, tag, chef, style de jeu, membres recherchés.\n• Les déclarations de guerre se font en jeu avec `/f relation <faction> enemy`.\n• Le règlement s\'applique : pas d\'insultes ni de provocation entre factions.',
  },
  {
    nom: '🛒・commerce', sujet: 'Achats, ventes et échanges entre joueurs',
    titre: '🛒 Commerce',
    texte: 'Proposez vos achats, ventes et services (minerai, bois, potions, constructions…).\n\n• Format conseillé : **[VENTE]** ou **[ACHAT]**, objet, quantité, prix.\n• L\'hôtel des ventes (`/hdv`) reste la façon la plus sûre d\'échanger.\n• Aucune vente contre de l\'argent réel.',
  },
  {
    nom: '🏗️・vos-constructions', sujet: 'Partagez vos plus belles constructions',
    titre: '🏗️ Vos constructions',
    texte: 'Montrez vos bases, villages, fermes et créations ! Une capture d\'écran, les coordonnées si vous le souhaitez, et quelques mots sur votre projet.\n\nLes plus belles constructions pourront être mises en avant par le staff.',
  },
  {
    nom: '🐞・bugs-et-suggestions-mc', sujet: 'Signaler un bug ou proposer une idée pour le serveur Minecraft',
    titre: '🐞 Bugs et suggestions',
    texte: 'Un bug sur le serveur ou une idée pour l\'améliorer ? C\'est ici.\n\n• **Bug** : décrivez ce qui se passe, où (coordonnées) et sur quelle version (Java ou Bedrock).\n• **Suggestion** : une idée par message ; votez avec ✅ et ❌.\n• Pour un problème personnel (objet perdu, sanction), ouvrez plutôt un ticket dans <#883689076786597998>.',
  },
];
const FICHIER = path.resolve('data', 'salons-mc.json');

export async function creerSalonsMinecraft(guild) {
  const salons = await guild.channels.fetch();
  const trouver = (nom, type) => salons.find((c) => c && c.name === nom && (type === undefined || c.type === type));
  let categorie = trouver(CATEGORIE, ChannelType.GuildCategory);
  const crees = [];
  if (!categorie) {
    categorie = await guild.channels.create({ name: CATEGORIE, type: ChannelType.GuildCategory, reason: 'Salons du serveur Minecraft' });
    const info = trouver('information', ChannelType.GuildCategory);
    if (info) await categorie.setPosition(info.position + 1).catch(() => {});
    crees.push(CATEGORIE);
  }
  const ids = { categorie: categorie.id };
  for (const s of SALONS_MC) {
    let salon = trouver(s.nom, ChannelType.GuildText);
    if (!salon) {
      salon = await guild.channels.create({
        name: s.nom, type: ChannelType.GuildText, parent: categorie.id, topic: s.sujet, reason: 'Salons du serveur Minecraft',
        permissionOverwrites: s.lecture ? [
          { id: guild.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads] },
          { id: guild.members.me.id, allow: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
        ] : [],
      });
      const files = [];
      if (s.pdf && fs.existsSync(path.resolve(s.pdf.b64))) files.push({ attachment: Buffer.from(fs.readFileSync(path.resolve(s.pdf.b64), 'utf8'), 'base64'), name: s.pdf.nom });
      const msg = await salon.send({
        embeds: [new EmbedBuilder().setColor(0x2e86c1).setTitle(s.titre).setDescription(s.texte).setFooter({ text: 'Les Naufragés · naufragesmc.mine.fun' })],
        files,
      });
      await msg.pin().catch(() => {});
      crees.push(s.nom);
    }
    ids[s.nom] = salon.id;
  }
  // Le pont DiscordSRV (#chat-minecraft) rejoint la catégorie.
  const chat = trouver('chat-minecraft', ChannelType.GuildText);
  if (chat && chat.parentId !== categorie.id) await chat.setParent(categorie.id, { lockPermissions: false }).catch(() => {});
  fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
  fs.writeFileSync(FICHIER, JSON.stringify(ids, null, 2));
  if (crees.length) console.log(`Salons Minecraft créés : ${crees.join(', ')}`);
  return crees;
}
