import fs from 'node:fs';
import path from 'node:path';
import { ChannelType, Events, PermissionFlagsBits } from 'discord.js';

// Salons vocaux :
// 1. « ➕・Crée ton salon » : en le rejoignant, le bot crée un vocal à ton nom (tu peux le renommer,
//    limiter, déplacer/muter dedans) et t'y déplace ; il est supprimé dès qu'il est vide.
//    ✨・Général redevient un vocal normal, ouvert à tous les membres.
// 2. Vocaux des jeux et du serveur Minecraft créés s'ils manquent (catégorie « 🎮 VOCAUX JEUX »).
// 3. Audit de tous les salons (data/audit-salons.json), lisible via l'API de l'hébergeur.
const F_TEMP = path.resolve('data', 'vocaux-temp.json');
const F_ETAT = path.resolve('data', 'vocaux.json');
const VERSION = 1;
const CAT_VOCAUX = '828255172534075432';
const GENERAL = '828255187129860126';
const GENERAL_2 = '1541537588282794044';
const MEMBRE = '828255111385055264';
const NOM_CREER = '➕・Crée ton salon';
const CAT_JEUX = '🎮 VOCAUX JEUX';
const FACTION_STAFF_ROLE = '1573796068045496391';
const HAUT_STAFF = ['828255085003669567', '828255086723465266', '828255092079329280', '828255090284036116'];
const VOCAUX_JEUX = [
  { nom: '⛏️・Minecraft 1', limite: 0 },
  { nom: '⛏️・Minecraft 2', limite: 0 },
  { nom: '🏴・Faction (guerre & raids)', limite: 10 },
  { nom: '🏗️・Build ensemble', limite: 0 },
  { nom: '🔫・Fortnite', limite: 4 },
  { nom: '🚗・Rocket League', limite: 3 },
  { nom: '🚓・GTA', limite: 0 },
  { nom: '🎯・Apex', limite: 3 },
  { nom: '🧱・Roblox', limite: 0 },
  { nom: '🛸・Among Us', limite: 15 },
  { nom: '🎮・Autres jeux', limite: 0 },
  { nom: '🏴・Faction Staff', limite: 0, prive: true },
];

const lireTemp = () => { try { return JSON.parse(fs.readFileSync(F_TEMP, 'utf8')); } catch { return {}; } };
const ecrireTemp = (t) => { fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(F_TEMP, JSON.stringify(t, null, 1)); };

export async function preparerVocaux(guild) {
  const salons = await guild.channels.fetch();
  const res = { version: VERSION, quand: new Date().toISOString(), actions: [] };
  // Nettoyage des salons temporaires vides (bot redémarré pendant qu'ils existaient).
  const temp = lireTemp();
  for (const id of Object.keys(temp)) {
    const c = salons.get(id);
    if (!c) delete temp[id];
    else if (c.members.size === 0) { await c.delete('Salon temporaire vide').catch(() => {}); delete temp[id]; }
  }
  ecrireTemp(temp);

  let etat = {}; try { etat = JSON.parse(fs.readFileSync(F_ETAT, 'utf8')); } catch {}
  if (etat.version !== VERSION || !etat.ok) {
    const trouver = (nom, type) => salons.find((c) => c && c.name === nom && c.type === type);
    // Salon « Crée ton salon », en haut de la catégorie vocaux.
    if (!trouver(NOM_CREER, ChannelType.GuildVoice)) {
      const c = await guild.channels.create({ name: NOM_CREER, type: ChannelType.GuildVoice, parent: salons.has(CAT_VOCAUX) ? CAT_VOCAUX : null, reason: 'Salons vocaux temporaires' });
      const premier = salons.filter((x) => x?.parentId === CAT_VOCAUX).sort((a, b) => a.position - b.position).first();
      if (premier) await c.setPosition(premier.position).catch(() => {});
      res.actions.push(`créé ${NOM_CREER}`);
    }
    // Général et Général 2 : vocaux normaux, ouverts aux membres (on enlève les refus éventuels).
    for (const id of [GENERAL, GENERAL_2]) {
      const c = salons.get(id); if (!c) continue;
      const avant = c.permissionOverwrites.cache.map((o) => ({ id: o.id, allow: o.allow.toArray(), deny: o.deny.toArray() }));
      res[`avant_${c.name}`] = avant;
      const o = c.permissionOverwrites.cache.get(MEMBRE);
      const bloque = o ? ['ViewChannel', 'Connect', 'Speak'].filter((p) => o.deny.has(PermissionFlagsBits[p])) : [];
      if (bloque.length) {
        await c.permissionOverwrites.edit(MEMBRE, Object.fromEntries(bloque.map((p) => [p, null])), { reason: 'Vocal Général ouvert aux membres' });
        res.actions.push(`${c.name} : refus ${bloque.join('/')} retiré pour Membre`);
      }
      const pm = c.permissionsFor(MEMBRE);
      if (pm && !['ViewChannel', 'Connect', 'Speak'].every((p) => pm.has(PermissionFlagsBits[p]))) {
        await c.permissionOverwrites.edit(MEMBRE, { ViewChannel: true, Connect: true, Speak: true }, { reason: 'Vocal Général ouvert aux membres' });
        res.actions.push(`${c.name} : ouvert aux membres (voir, connecter, parler)`);
      }
      if (c.userLimit && c.userLimit < 99) { /* limite laissée telle quelle */ }
    }
    // Vocaux des jeux.
    let cat = trouver(CAT_JEUX, ChannelType.GuildCategory);
    if (!cat) {
      cat = await guild.channels.create({ name: CAT_JEUX, type: ChannelType.GuildCategory, reason: 'Vocaux des jeux' });
      const vocaux = salons.get(CAT_VOCAUX);
      if (vocaux) await cat.setPosition(vocaux.position + 1).catch(() => {});
      res.actions.push(`créé catégorie ${CAT_JEUX}`);
    }
    const roles = await guild.roles.fetch();
    for (const v of VOCAUX_JEUX) {
      if (salons.find((c) => c && c.type === ChannelType.GuildVoice && c.name === v.nom)) continue;
      const voir = [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.Stream, PermissionFlagsBits.UseVAD];
      const prive = v.prive && roles.has(FACTION_STAFF_ROLE) ? [
        { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
        { id: FACTION_STAFF_ROLE, allow: voir },
        ...HAUT_STAFF.filter((id) => roles.has(id)).map((id) => ({ id, allow: voir })),
        { id: guild.members.me.id, allow: [...voir, PermissionFlagsBits.ManageChannels] },
      ] : undefined;
      await guild.channels.create({ name: v.nom, type: ChannelType.GuildVoice, parent: cat.id, userLimit: v.limite, permissionOverwrites: prive, reason: 'Vocaux des jeux' });
      res.actions.push(`créé ${v.nom}`);
    }
    res.ok = true;
    fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(F_ETAT, JSON.stringify(res, null, 1));
    console.log(`Vocaux : ${res.actions.join(' ; ') || 'rien à faire'}`);
  }
  await cacherBureauStaff(guild).catch((e) => console.error('Bureau Staff :', e.message));
  await auditSalons(guild).catch((e) => console.error('Audit salons :', e.message));
}

// Audit : pour chaque salon, qui peut le voir / écrire / parler (@everyone, Membre, Non-vérifié).
async function auditSalons(guild) {
  const salons = await guild.channels.fetch();
  const roles = await guild.roles.fetch();
  const nonVerif = roles.find((r) => r.name === 'Non-vérifié');
  const qui = { everyone: guild.roles.everyone, membre: roles.get(MEMBRE), nonVerifie: nonVerif };
  const P = PermissionFlagsBits;
  const liste = [...salons.values()].filter(Boolean).sort((a, b) => (a.parent?.position ?? a.position) - (b.parent?.position ?? b.position) || a.position - b.position).map((c) => {
    const d = { id: c.id, nom: c.name, type: ChannelType[c.type], categorie: c.parent?.name ?? null, synchro: c.permissionsLocked ?? null };
    for (const [k, r] of Object.entries(qui)) {
      if (!r) continue;
      const p = c.permissionsFor(r);
      d[k] = [p.has(P.ViewChannel) && 'voir', p.has(P.SendMessages) && 'écrire', p.has(P.Connect) && 'connecter', p.has(P.Speak) && 'parler'].filter(Boolean).join(',') || '-';
    }
    if (c.isTextBased?.() && c.lastMessageId) d.dernierMessage = new Date(Number((BigInt(c.lastMessageId) >> 22n) + 1420070400000n)).toISOString().slice(0, 10);
    if (c.type === ChannelType.GuildVoice) d.limite = c.userLimit;
    return d;
  });
  // Qui a créé des salons récemment (pour repérer un autre bot de vocaux temporaires).
  let creations = [];
  try {
    const logs = await guild.fetchAuditLogs({ type: 10, limit: 100 });
    creations = logs.entries.map((e) => ({ quand: e.createdAt.toISOString(), par: e.executor?.tag, bot: e.executor?.bot, salon: e.changes?.find((x) => x.key === 'name')?.new }));
  } catch (e) { creations = [`erreur : ${e.message}`]; }
  fs.writeFileSync(path.resolve('data', 'audit-salons.json'), JSON.stringify({ salons: liste, creations }, null, 1));
}

export function brancherVocaux(client) {
  client.on(Events.VoiceStateUpdate, async (avant, apres) => {
    try {
      const temp = lireTemp();
      // Entrée dans « Crée ton salon » : nouveau vocal à son nom.
      if (apres.channel && apres.channel.name === NOM_CREER && apres.member) {
        const m = apres.member;
        const deja = Object.entries(temp).find(([, v]) => v.proprio === m.id);
        const existant = deja && apres.guild.channels.cache.get(deja[0]);
        if (existant) { await m.voice.setChannel(existant).catch(() => {}); return; }
        const c = await apres.guild.channels.create({
          name: `🔊・Salon de ${m.displayName}`.slice(0, 100), type: ChannelType.GuildVoice, parent: apres.channel.parentId,
          reason: `Salon vocal temporaire de ${m.user.tag}`,
          permissionOverwrites: [
            ...apres.channel.parent ? apres.channel.parent.permissionOverwrites.cache.map((o) => ({ id: o.id, allow: o.allow, deny: o.deny })) : [],
            { id: m.id, allow: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.MuteMembers, PermissionFlagsBits.Connect, PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Speak] },
          ],
        });
        await c.setPosition(apres.channel.position + 1).catch(() => {});
        temp[c.id] = { proprio: m.id, cree: Date.now() }; ecrireTemp(temp);
        await m.voice.setChannel(c).catch(async () => { await c.delete().catch(() => {}); delete temp[c.id]; ecrireTemp(temp); });
        return;
      }
      // Sortie d'un salon temporaire : supprimé s'il est vide.
      if (avant.channel && temp[avant.channel.id] && avant.channel.members.size === 0) {
        delete temp[avant.channel.id]; ecrireTemp(temp);
        await avant.channel.delete('Salon temporaire vide').catch(() => {});
      }
    } catch (e) { console.error('Vocaux temporaires :', e.message); }
  });
}

// Vocal 👮・Bureau Staff caché aux Membres ; les rôles qui pouvaient s'y connecter gardent l'accès (une fois).
const BUREAU_STAFF = '828255184115335180';
async function cacherBureauStaff(guild) {
  const F = path.resolve('data', 'bureau-staff.json');
  if (fs.existsSync(F)) return;
  const c = await guild.channels.fetch(BUREAU_STAFF).catch(() => null);
  if (!c) return;
  const res = { quand: new Date().toISOString(), ouverts: [] };
  for (const o of c.permissionOverwrites.cache.values()) {
    if (o.id === MEMBRE || o.id === guild.roles.everyone.id) continue;
    if (o.allow.has(PermissionFlagsBits.Connect) && !o.allow.has(PermissionFlagsBits.ViewChannel)) {
      await c.permissionOverwrites.edit(o.id, { ViewChannel: true }, { reason: 'Bureau Staff : accès staff gardé' });
      res.ouverts.push(o.id);
    }
  }
  await c.permissionOverwrites.edit(MEMBRE, { ViewChannel: false }, { reason: 'Bureau Staff caché aux membres' });
  await c.permissionOverwrites.edit(guild.roles.everyone.id, { ViewChannel: false }, { reason: 'Bureau Staff caché aux membres' });
  res.acces = c.permissionOverwrites.cache.filter((o) => o.allow.has(PermissionFlagsBits.ViewChannel)).map((o) => o.id);
  fs.writeFileSync(F, JSON.stringify(res, null, 1));
  console.log(`Bureau Staff caché ; accès gardé pour ${res.acces.length} rôle(s)`);
}
