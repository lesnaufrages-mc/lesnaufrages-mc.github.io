import fs from 'node:fs';
import path from 'node:path';
import { ChannelType, EmbedBuilder, PermissionFlagsBits } from 'discord.js';

// Faction du staff sur le serveur Minecraft : rôle « 🏴・Faction Staff » (rangé sous 🔥・Staff)
// + salon privé « 🏴・faction-staff » dans la catégorie staff, avec un message de présentation épinglé.
// Créé une seule fois au démarrage (data/faction-staff.json). Le rôle se donne à la main.
const F = path.resolve('data', 'faction-staff.json');
const NOM_ROLE = '🏴・Faction Staff';
const NOM_SALON = '🏴・faction-staff';
const ROLE_STAFF = '828255100124135475';
const CATEGORIE_STAFF = '828255176518795264';
const HAUT_STAFF = ['828255085003669567', '828255086723465266', '828255092079329280', '828255090284036116']; // fondateur, co-fondateur, responsable staff, admin

export async function creerFactionStaff(guild) {
  let etat = {}; try { etat = JSON.parse(fs.readFileSync(F, 'utf8')); } catch {}
  if (etat.ok) return;
  const res = { quand: new Date().toISOString() };
  const roles = await guild.roles.fetch();
  let role = roles.find((r) => r.name === NOM_ROLE);
  if (!role) {
    role = await guild.roles.create({ name: NOM_ROLE, color: 0x8b1e2d, hoist: false, mentionable: true, permissions: [], reason: 'Faction du staff (serveur Minecraft)' });
    res.roleCree = true;
  }
  res.role = role.id;
  const staff = roles.get(ROLE_STAFF);
  if (staff && role.position !== staff.position - 1) {
    try { await role.setPosition(staff.position - 1, { reason: 'Rangé sous le rôle Staff' }); res.range = true; } catch (e) { res.rangeErreur = e.message; }
  }
  const salons = await guild.channels.fetch();
  let salon = salons.find((c) => c?.name === NOM_SALON && c.type === ChannelType.GuildText);
  if (!salon) {
    const voir = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.EmbedLinks, PermissionFlagsBits.AddReactions];
    salon = await guild.channels.create({
      name: NOM_SALON, type: ChannelType.GuildText, parent: salons.has(CATEGORIE_STAFF) ? CATEGORIE_STAFF : null,
      topic: 'Salon privé de la Faction Staff : organisation, projets et événements de la faction du staff sur le serveur Minecraft',
      reason: 'Salon de la Faction Staff',
      permissionOverwrites: [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: role.id, allow: voir },
        ...HAUT_STAFF.filter((id) => roles.has(id)).map((id) => ({ id, allow: voir })),
        { id: guild.members.me.id, allow: [...voir, PermissionFlagsBits.ManageMessages] },
      ],
    });
    res.salonCree = true;
    const embed = new EmbedBuilder().setColor(0x8b1e2d).setTitle('🏴 Faction Staff').setDescription(
      'Bienvenue dans le salon de la **Faction Staff**, la faction officielle de l\'équipe sur `naufragesmc.mine.fun`.\n\n'
      + '**🎯 Rôle de la faction**\n'
      + '• Montrer l\'exemple : une faction active, fair-play et accueillante.\n'
      + '• Animer le serveur : événements, guerres amicales, défis et tournois.\n'
      + '• Tester les nouveautés (quêtes, métiers, zones) avant les joueurs.\n\n'
      + '**⚖️ Règles de la faction**\n'
      + '• En faction, on joue en **survie comme tout le monde** : aucune commande staff, aucun give, aucun vol, aucun TP pour avancer.\n'
      + '• Les outils de modération servent seulement à la modération, jamais pour la faction.\n'
      + '• Pas de raid sur les nouveaux joueurs ni sur les petites factions sans déclaration de guerre.\n'
      + '• Les infos internes du staff (sanctions, tickets, plaintes) restent dans les salons staff.\n\n'
      + '**🗂️ Organisation**\n'
      + '• Tag et nom de faction, base et projets : à décider ici.\n'
      + '• Un message par idée ou projet, avec les coordonnées si besoin.\n'
      + '• Réunions de faction annoncées ici, en dehors des réunions staff.\n\n'
      + 'Le rôle <@&' + role.id + '> est donné par le haut staff.',
    ).setFooter({ text: 'Les Naufragés · Faction Staff' });
    const msg = await salon.send({ embeds: [embed] });
    await msg.pin().catch(() => {});
  }
  res.salon = salon.id; res.ok = true;
  fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(F, JSON.stringify(res, null, 1));
  console.log(`Faction Staff : rôle ${role.id}${res.roleCree ? ' créé' : ''}, salon ${salon.id}${res.salonCree ? ' créé' : ''}${res.rangeErreur ? ` (rangement : ${res.rangeErreur})` : ''}`);
}
