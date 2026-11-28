import fs from 'node:fs';
import path from 'node:path';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';

// Votes pour le serveur Minecraft (VotingPlugin + Votifier côté serveur).
// data/votes.json = [{ nom: "Serveurs-Minecraft.org", url: "https://..." }] : liens des sites de vote.
// Le salon #🗳️・votes est créé dans la catégorie Minecraft ; son message est mis à jour quand les liens changent.
const F_LIENS = path.resolve('data', 'votes.json');
const F_PANNEAU = path.resolve('data', 'panneau-votes.json');
const NOM_SALON = '🗳️・votes';
const CATEGORIE = '⛏️ SERVEUR MINECRAFT';

const lireJson = (f, defaut) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return defaut; } };
export const liensVote = () => (lireJson(F_LIENS, []) ?? []).filter((l) => l?.nom && /^https?:\/\//.test(l.url ?? ''));

export function messageVotes(liens = liensVote()) {
  const embed = new EmbedBuilder().setColor(0x27ae60).setTitle('🗳️ Votez pour Les Naufragés !')
    .setDescription([
      'Chaque vote fait remonter le serveur dans les classements et attire de nouveaux joueurs. C\'est gratuit, ça prend 30 secondes, et vous êtes récompensé en jeu.',
      '',
      '**🎁 Récompenses à chaque vote**',
      '💰 150 $ crédités sur votre compte',
      '💎 3 émeraudes',
      '📣 Votre vote annoncé en jeu et sur le Discord',
      '',
      '**📝 Comment voter ?**',
      '**1.** Cliquez sur un site ci-dessous',
      '**2.** Entrez votre **pseudo Minecraft exact** (Bedrock : avec le point devant, ex. `.Pseudo`)',
      '**3.** Validez : la récompense arrive automatiquement, même hors ligne, à votre prochaine connexion',
      '',
      'Vous pouvez voter sur **chaque site**, une fois toutes les 24 heures environ.',
      liens.length ? '' : '\n⏳ Les liens des sites de vote arrivent très bientôt dans ce salon.',
      '',
      '💡 En jeu : `/vote` · Sur Discord : `/vote`',
    ].join('\n'))
    .setFooter({ text: 'Les Naufragés · naufragesmc.mine.fun' });
  const boutons = liens.slice(0, 25).map((l) => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(String(l.nom).slice(0, 80)).setURL(l.url).setEmoji('🗳️'));
  const rangees = [];
  for (let k = 0; k < boutons.length; k += 5) rangees.push(new ActionRowBuilder().addComponents(boutons.slice(k, k + 5)));
  return { embeds: [embed], components: rangees };
}

// Au démarrage : crée le salon si besoin, poste ou met à jour le panneau des votes.
export async function preparerVotes(guild) {
  const salons = await guild.channels.fetch();
  let salon = salons.find((c) => c?.name === NOM_SALON && c.type === ChannelType.GuildText);
  if (!salon) {
    const cat = salons.find((c) => c?.name === CATEGORIE && c.type === ChannelType.GuildCategory);
    salon = await guild.channels.create({
      name: NOM_SALON, type: ChannelType.GuildText, parent: cat?.id ?? null, topic: 'Votez pour le serveur Minecraft et gagnez des récompenses',
      permissionOverwrites: [
        { id: guild.id, deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.CreatePublicThreads] },
        { id: guild.members.me.id, allow: [PermissionFlagsBits.SendMessages] },
      ],
      reason: 'Votes du serveur Minecraft',
    });
    console.log('Salon #votes créé');
  }
  const liens = liensVote();
  const signature = JSON.stringify(liens);
  const p = lireJson(F_PANNEAU, {});
  const msg = p.message ? await salon.messages.fetch(p.message).catch(() => null) : null;
  if (msg && p.signature === signature) return;
  if (msg) await msg.edit(messageVotes(liens));
  else {
    const nouveau = await salon.send(messageVotes(liens));
    await nouveau.pin().catch(() => {});
    p.message = nouveau.id;
  }
  fs.mkdirSync(path.dirname(F_PANNEAU), { recursive: true });
  fs.writeFileSync(F_PANNEAU, JSON.stringify({ message: p.message, salon: salon.id, signature }));
  console.log(`Panneau des votes à jour (${liens.length} site(s))`);
}

// /vote : liens de vote en privé.
export async function commandeVote(i) {
  const m = messageVotes();
  return i.reply({ ...m, flags: MessageFlags.Ephemeral });
}
