import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import dns from 'node:dns/promises';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { noterMesure } from './rapport.js';
import { SIGNATURE, embedMaintenance, maintenance, maintenanceActive, terminerMaintenance, verifierMaintenance } from './annonces-mc.js';

// État du serveur Minecraft dans un salon Discord.
//  - Un message « Statut du serveur » est posté une fois puis MODIFIÉ (jamais reposté) : joueurs, version, adresse.
//  - À chaque changement (en ligne / redémarrage / éteint), une petite annonce est postée ;
//    l'annonce précédente est supprimée pour garder le salon propre.
// Lecture par un simple « ping » Minecraft, comme la liste des serveurs du jeu : aucune clé ni mot de passe.
const env = process.env;
export const MC = {
  salon: env.SALON_MINECRAFT_ID || '1017711078752407622',
  adresse: env.MC_ADRESSE || 'naufragesmc.mine.fun',
  port: Number(env.MC_PORT || 30601),
  portBedrock: Number(env.MC_PORT_BEDROCK || 30603),
  ipSecours: env.MC_IP || '91.197.6.25', // si le nom ne répond pas (panne DNS)
};
const FICHIER = path.resolve('data', 'minecraft.json');
const PIED = 'Statut du serveur · mis à jour chaque minute';

// Délais : 2 pings ratés de suite = hors ligne ; au-delà de 10 min sans retour = « éteint ».
export const ECHECS_AVANT_HORS_LIGNE = 2;
export const REDEMARRAGE_MAX_MS = 10 * 60_000;

// ---------------------------------------------------------------------------
// Ping Minecraft (Server List Ping, protocole Java)
// ---------------------------------------------------------------------------
function varint(n) {
  const octets = [];
  do {
    let b = n & 0x7f;
    n >>>= 7;
    if (n) b |= 0x80;
    octets.push(b);
  } while (n);
  return Buffer.from(octets);
}
function lireVarint(buf, pos) {
  let val = 0;
  let dec = 0;
  for (;;) {
    if (pos >= buf.length) return null;
    const b = buf[pos++];
    val |= (b & 0x7f) << dec;
    if (!(b & 0x80)) return { val, pos };
    dec += 7;
    if (dec > 35) throw new Error('varint trop long');
  }
}
const paquet = (...parts) => {
  const corps = Buffer.concat(parts);
  return Buffer.concat([varint(corps.length), corps]);
};

export function ping(hote, port, delai = 5000) {
  return new Promise((ok, ko) => {
    const s = net.connect({ host: hote, port });
    let recu = Buffer.alloc(0);
    const fin = (err, res) => { s.destroy(); clearTimeout(t); err ? ko(err) : ok(res); };
    const t = setTimeout(() => fin(new Error('délai dépassé')), delai);
    s.on('error', (e) => fin(e));
    s.on('connect', () => {
      const h = Buffer.from(hote, 'utf8');
      const p = Buffer.alloc(2); p.writeUInt16BE(port);
      s.write(paquet(varint(0), varint(767), varint(h.length), h, p, varint(1))); // handshake → statut
      s.write(paquet(varint(0))); // demande de statut
    });
    s.on('data', (d) => {
      recu = Buffer.concat([recu, d]);
      try {
        const l = lireVarint(recu, 0); if (!l || recu.length < l.pos + l.val) return;
        const id = lireVarint(recu, l.pos);
        const n = lireVarint(recu, id.pos);
        const json = recu.subarray(n.pos, n.pos + n.val).toString('utf8');
        fin(null, lireStatut(JSON.parse(json)));
      } catch (e) { fin(e); }
    });
    s.on('close', () => fin(new Error('connexion fermée')));
  });
}

const texteMotd = (d) => (typeof d === 'string' ? d : [d?.text ?? '', ...(d?.extra ?? []).map(texteMotd)].join(''));
export function lireStatut(j) {
  return {
    joueurs: j.players?.online ?? 0,
    max: j.players?.max ?? 0,
    noms: (j.players?.sample ?? []).map((p) => p.name).filter((n) => n && !/§/.test(n)),
    version: String(j.version?.name ?? '').replace(/§./g, '').trim(),
    motd: texteMotd(j.description).replace(/§./g, '').trim(),
  };
}

// Ping avec l'enregistrement SRV s'il existe, sinon nom:port, sinon l'IP de secours.
export async function mesurer() {
  const cibles = [];
  const srv = await dns.resolveSrv(`_minecraft._tcp.${MC.adresse}`).catch(() => []);
  if (srv[0]) cibles.push([srv[0].name, srv[0].port]);
  cibles.push([MC.adresse, MC.port]);
  if (MC.ipSecours) cibles.push([MC.ipSecours, MC.port]);
  for (const [h, p] of cibles) {
    try { return await ping(h, p); } catch { /* cible suivante */ }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Logique des états (sans Discord, testable)
// ---------------------------------------------------------------------------
// Fenêtre du redémarrage quotidien prévu (planning MineStrator : 5 h, heure belge).
export function redemarragePrevu(date = new Date()) {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .format(date).split(':').map(Number);
  const min = h * 60 + m;
  return min >= 4 * 60 + 55 && min < 5 * 60 + 20;
}

// e = { etat: 'inconnu'|'en_ligne'|'redemarrage'|'eteint', depuis, echecs, infos }
// Renvoie le nouvel état + l'annonce à poster (ou null).
export function suivant(e, mesure, maintenant = Date.now()) {
  const n = { ...e, infos: mesure ?? e.infos };
  if (mesure) {
    n.echecs = 0;
    if (e.etat === 'en_ligne') return { e: n, annonce: null };
    const annonce = e.etat === 'inconnu' ? null : 'en_ligne';
    return { e: { ...n, etat: 'en_ligne', depuis: maintenant }, annonce };
  }
  n.echecs = (e.echecs ?? 0) + 1;
  if (e.etat === 'inconnu') {
    if (n.echecs < ECHECS_AVANT_HORS_LIGNE) return { e: n, annonce: null };
    return { e: { ...n, etat: 'eteint', depuis: maintenant }, annonce: null };
  }
  if (e.etat === 'en_ligne') {
    if (n.echecs < ECHECS_AVANT_HORS_LIGNE) return { e: n, annonce: null };
    return { e: { ...n, etat: 'redemarrage', depuis: maintenant, prevu: redemarragePrevu(new Date(maintenant)) }, annonce: 'redemarrage' };
  }
  if (e.etat === 'redemarrage' && maintenant - e.depuis > REDEMARRAGE_MAX_MS) {
    return { e: { ...n, etat: 'eteint', depuis: maintenant }, annonce: 'eteint' };
  }
  return { e: n, annonce: null };
}

const STYLE = {
  en_ligne: { couleur: 0x3fae5a, titre: '🟢 En ligne' },
  redemarrage: { couleur: 0xf39c12, titre: '🔄 Redémarrage en cours' },
  eteint: { couleur: 0xe74c3c, titre: '🔴 Éteint' },
  inconnu: { couleur: 0x95a5a6, titre: '⚪ Vérification…' },
};

export function embedStatut(e) {
  const s = STYLE[e.etat] ?? STYLE.inconnu;
  const i = e.infos;
  const embed = new EmbedBuilder()
    .setColor(s.couleur)
    .setTitle('⛏️ Serveur Minecraft · Les Naufragés')
    .addFields(
      { name: 'État', value: e.etat === 'redemarrage' && e.prevu ? '🔄 Redémarrage quotidien (5 h)' : s.titre, inline: true },
    )
    .setFooter({ text: PIED })
    .setTimestamp(new Date());
  if (e.etat === 'en_ligne' && i) {
    const noms = i.noms.length ? `\n${i.noms.slice(0, 15).join(', ')}` : '';
    embed.addFields(
      { name: 'Joueurs', value: `**${i.joueurs}** / ${i.max}${noms}`.slice(0, 1024), inline: true },
      { name: 'Version', value: i.version || '?', inline: true },
    );
  }
  if (e.depuis && e.etat !== 'inconnu') {
    embed.addFields({ name: e.etat === 'en_ligne' ? 'En ligne depuis' : 'Depuis', value: `<t:${Math.floor(e.depuis / 1000)}:R>`, inline: true });
  }
  embed.addFields(
    { name: '☕ Java', value: `\`${MC.adresse}\``, inline: false },
    { name: '📱 Bedrock (téléphone, console)', value: `Adresse \`${MC.adresse}\` · port \`${MC.portBedrock}\``, inline: false },
  );
  return embed;
}

// Annonce d'un changement d'état, sur un ton officiel. e.maintenance = maintenance programmée en cours (ou null).
export function texteAnnonce(type, e) {
  const m = e.maintenance;
  const embed = new EmbedBuilder().setFooter({ text: SIGNATURE }).setTimestamp(new Date());
  if (type === 'en_ligne') {
    if (m) return { embeds: [embedMaintenance(m, 'fin')] };
    const j = e.infos ? `\n👥 Joueurs connectés : **${e.infos.joueurs}** / ${e.infos.max}` : '';
    return { embeds: [embed.setColor(0x3fae5a).setTitle('🟢 Le serveur Minecraft est de nouveau en ligne')
      .setDescription(`Le serveur est opérationnel et accepte les connexions.\n☕ Java : \`${MC.adresse}\` · 📱 Bedrock : \`${MC.adresse}\` port \`${MC.portBedrock}\`${j}\n\nBon jeu à toutes et à tous !`)] };
  }
  if (type === 'redemarrage') {
    if (m) return { embeds: [embedMaintenance(m, 'debut')] };
    if (e.prevu) {
      return { embeds: [embed.setColor(0xf39c12).setTitle('🔄 Redémarrage quotidien programmé')
        .setDescription('Comme chaque jour à 5 h, le serveur redémarre afin de libérer la mémoire et de garantir de bonnes performances. '
          + 'Le retour est prévu d\'ici quelques minutes. Vos constructions et inventaires sont sauvegardés : aucune action n\'est nécessaire de votre part.')] };
    }
    return { embeds: [embed.setColor(0xf39c12).setTitle('🔄 Redémarrage du serveur en cours')
      .setDescription('Le serveur redémarre (application d\'une mise à jour ou d\'un réglage). Le retour est prévu d\'ici quelques minutes. '
        + 'Vos constructions et inventaires sont sauvegardés. Un message sera publié ici dès la réouverture.')] };
  }
  if (m) return { embeds: [embedMaintenance(m, 'debut')] };
  return { embeds: [embed.setColor(0xe74c3c).setTitle('🔴 Interruption de service')
    .setDescription('Le serveur Minecraft est actuellement hors ligne. L\'équipe est informée et travaille à son rétablissement. '
      + 'Nous vous prions de nous excuser pour la gêne occasionnée ; un message sera publié ici dès le retour du serveur.')] };
}

// ---------------------------------------------------------------------------
// Partie Discord
// ---------------------------------------------------------------------------
function lire() {
  try { return JSON.parse(fs.readFileSync(FICHIER, 'utf8')); } catch { return {}; }
}
function ecrire(d) {
  try {
    fs.mkdirSync(path.dirname(FICHIER), { recursive: true });
    fs.writeFileSync(FICHIER, JSON.stringify(d));
  } catch (e) { console.error('Minecraft (sauvegarde) :', e.message); }
}

let memo = { ...lire(), etat: 'inconnu', echecs: 0 }; // on garde les ids des messages, l'état est remesuré
let derniereEdition = 0;
let signature = '';
let enCours = false;

// Retrouve le message de statut (id mémorisé, sinon on cherche parmi les derniers messages du bot).
async function messageStatut(salon, client) {
  if (memo.messageId) {
    const m = await salon.messages.fetch(memo.messageId).catch(() => null);
    if (m) return m;
  }
  const recents = await salon.messages.fetch({ limit: 30 }).catch(() => null);
  const m = recents?.find((x) => x.author.id === client.user.id && x.embeds[0]?.footer?.text === PIED);
  if (m) { memo.messageId = m.id; return m; }
  return null;
}

export async function verifierMinecraft(client) {
  if (!MC.salon || enCours) return;
  enCours = true;
  try {
    const salon = await client.channels.fetch(MC.salon).catch(() => null);
    if (!salon?.isTextBased()) return console.error('Salon Minecraft introuvable : vérifie SALON_MINECRAFT_ID.');
    const mesure = await mesurer();
    noterMesure(mesure);
    let { e, annonce } = suivant(memo, mesure);
    memo = { ...memo, ...e };

    await verifierMaintenance(client);
    const maint0 = maintenance();
    if (annonce === 'eteint' && maintenanceActive(maint0)) annonce = null; // maintenance déjà annoncée
    if (annonce) {
      const maint = maintenance();
      const actif = maintenanceActive(maint) ? maint : null;
      // Les annonces automatiques remplacent la précédente (salon propre) ; celles de maintenance restent.
      if (memo.annonceId && !memo.annonceGardee) await salon.messages.delete(memo.annonceId).catch(() => {});
      const m = await salon.send(texteAnnonce(annonce, { ...memo, maintenance: actif })).catch((err) => console.error('Minecraft (annonce) :', err.message));
      memo.annonceId = m?.id ?? null;
      memo.annonceGardee = Boolean(actif);
      if (actif && annonce === 'en_ligne') terminerMaintenance();
    }

    // On modifie le message si quelque chose a changé, sinon toutes les 5 min (pour l'heure « mis à jour »).
    const sig = JSON.stringify([memo.etat, memo.prevu, memo.infos?.joueurs, memo.infos?.noms, memo.infos?.version]);
    let msg = await messageStatut(salon, client);
    if (!msg) {
      msg = await salon.send({ embeds: [embedStatut(memo)] });
      memo.messageId = msg.id;
      derniereEdition = Date.now(); signature = sig;
    } else if (sig !== signature || Date.now() - derniereEdition > 5 * 60_000) {
      await msg.edit({ embeds: [embedStatut(memo)] });
      derniereEdition = Date.now(); signature = sig;
    }
    ecrire({ messageId: memo.messageId, annonceId: memo.annonceId, annonceGardee: memo.annonceGardee });
  } catch (err) {
    console.error('Minecraft :', err.message);
  } finally {
    enCours = false;
  }
}

// /serveur : l'état tout de suite, visible seulement par celui qui demande.
export async function commandeServeur(i) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const mesure = await mesurer();
  const e = mesure
    ? { ...memo, etat: 'en_ligne', infos: mesure, depuis: memo.etat === 'en_ligne' ? memo.depuis : null }
    : { ...memo, etat: memo.etat === 'redemarrage' ? 'redemarrage' : 'eteint' };
  return i.editReply({ embeds: [embedStatut(e)] });
}
