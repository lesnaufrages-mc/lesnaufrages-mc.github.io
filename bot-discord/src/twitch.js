import fs from 'node:fs';
import path from 'node:path';
import { EmbedBuilder } from 'discord.js';

// Annonce des lives Twitch de lordmattstark dans #live, avec le rôle « notif youtube / live 🎥 ».
// Vérifie toutes les 2 min via decapi.me (sans clé Twitch). Une annonce par live.
// Les rôles des abonnés (subs) sont donnés par l'intégration Twitch de Discord, pas par le bot.

const CHAINE = 'lordmattstark';
const SALON_LIVE = '883727117525864448';
const ROLE_NOTIF_LIVE = '884126655612850318';
const F = path.resolve('data', 'twitch.json');
const lire = () => { try { return JSON.parse(fs.readFileSync(F, 'utf8')); } catch { return {}; } };
const ecrire = (v) => { try { fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(F, JSON.stringify(v, null, 1)); } catch {} };

const api = async (quoi) => {
  const r = await fetch(`https://decapi.me/twitch/${quoi}/${CHAINE}`, { headers: { 'User-Agent': 'NaufragesBot' }, signal: AbortSignal.timeout(10_000) });
  if (!r.ok) throw new Error(`decapi ${r.status}`);
  return (await r.text()).trim();
};
// Pure, testée : « lordmattstark is offline » / erreur => hors ligne ; « 1 hour, 2 minutes » => en ligne.
export const estEnLive = (uptime) => Boolean(uptime) && !/offline|not found|error|erreur|n'existe/i.test(uptime);

export async function verifierTwitch(client) {
  let uptime;
  try { uptime = await api('uptime'); } catch { return; }
  const etat = lire();
  const live = estEnLive(uptime);
  if (live && !etat.enLive) {
    const [titre, jeu] = await Promise.all([api('title').catch(() => ''), api('game').catch(() => '')]);
    const salon = await client.channels.fetch(SALON_LIVE).catch(() => null);
    if (salon) {
      const embed = new EmbedBuilder().setColor(0x9146ff).setAuthor({ name: `${CHAINE} est en live sur Twitch !` })
        .setTitle(titre || 'Live en cours').setURL(`https://www.twitch.tv/${CHAINE}`)
        .setDescription(`${jeu ? `🎮 **${jeu}**\n` : ''}Viens dire bonjour dans le chat 👋`)
        .setImage(`https://static-cdn.jtvnw.net/previews-ttv/live_user_${CHAINE}-1280x720.jpg?t=${Date.now()}`);
      await salon.send({ content: `<@&${ROLE_NOTIF_LIVE}> 🔴 **Le live commence !** https://www.twitch.tv/${CHAINE}`, embeds: [embed], allowedMentions: { roles: [ROLE_NOTIF_LIVE] } }).catch((e) => console.error('Twitch :', e.message));
    }
    ecrire({ enLive: true, debut: Date.now() });
    console.log('Twitch : live annoncé');
  } else if (!live && etat.enLive) {
    ecrire({ enLive: false, fin: Date.now() });
  }
}
