import fs from 'node:fs';
import path from 'node:path';
import { EmbedBuilder } from 'discord.js';

// --- Sons du Soundboard ---
// data/sons-a-ajouter.json = [{ nom, emoji, fichier: "data/sons/x.b64", volume? }] (fichiers mp3 en base64).
// Le bot ajoute au démarrage ceux qui n'existent pas encore, puis note le résultat dans data/sons-resultat.json.
const F_SONS = path.resolve('data', 'sons-a-ajouter.json');
const F_RESULTAT = path.resolve('data', 'sons-resultat.json');

export async function ajouterSons(guild) {
  let liste;
  try { liste = JSON.parse(fs.readFileSync(F_SONS, 'utf8')); } catch { return; }
  if (!Array.isArray(liste) || !liste.length) return;
  const existants = await guild.soundboardSounds.fetch().catch(() => null);
  const noms = new Set([...(existants?.values() ?? [])].map((s) => s.name));
  const resultat = [];
  const restants = [];
  for (const s of liste) {
    if (noms.has(s.nom)) { resultat.push({ nom: s.nom, ok: true, note: 'existait déjà' }); continue; }
    try {
      const fichier = Buffer.from(fs.readFileSync(path.resolve(s.fichier), 'utf8'), 'base64');
      await guild.soundboardSounds.create({
        file: fichier, contentType: 'audio/mpeg', name: s.nom, emojiName: s.emoji, volume: s.volume ?? 0.8,
        reason: 'Sons du serveur ajoutés par Naufragés Bot',
      });
      resultat.push({ nom: s.nom, ok: true });
      try { fs.unlinkSync(path.resolve(s.fichier)); } catch { /* rien */ }
    } catch (e) {
      resultat.push({ nom: s.nom, ok: false, erreur: e.message });
      restants.push(s);
    }
  }
  fs.writeFileSync(F_SONS, JSON.stringify(restants, null, 2));
  fs.writeFileSync(F_RESULTAT, JSON.stringify({ date: new Date().toISOString(), resultat }, null, 2));
  console.log(`Soundboard : ${resultat.filter((r) => r.ok).length} ok, ${restants.length} en échec`);
}

// --- Remerciement automatique à chaque nouveau boost ---
export const SALON_BOOST = '883687116847083620';
export async function remercierBoost(ancien, nouveau) {
  if (ancien.premiumSince || !nouveau.premiumSince) return;
  const salon = await nouveau.guild.channels.fetch(SALON_BOOST).catch(() => null);
  if (!salon) return;
  const total = nouveau.guild.premiumSubscriptionCount ?? 0;
  await salon.send({
    content: `${nouveau}`,
    embeds: [new EmbedBuilder().setColor(0xf47fff).setTitle('🔮 Merci pour ton boost !')
      .setDescription([
        `${nouveau} vient de booster **Les Naufragés Community** : un immense merci, moussaillon ! ⚓`,
        '',
        `Le serveur compte désormais **${total} boost${total > 1 ? 's' : ''}**.`,
        'Ton rôle 🔮・Booster est actif, et ton soutien fait grandir toute la communauté.',
      ].join('\n'))
      .setThumbnail(nouveau.displayAvatarURL())
      .setFooter({ text: 'Les Naufragés · naufragesmc.mine.fun' })],
    allowedMentions: { users: [nouveau.id] },
  }).catch((e) => console.error('Boost :', e.message));
}

// --- Photo de profil / bannière du bot ---
// Déposer data/avatar.b64 et/ou data/banniere.b64 (image en base64) : appliquées au démarrage puis supprimées.
// Résultat dans data/profil-resultat.json.
export async function majProfilBot(client) {
  const res = {};
  for (const [fichier, type, faire] of [
    ['avatar.b64', 'avatar', (b) => client.user.setAvatar(b)],
    ['banniere.b64', 'banniere', (b) => client.user.setBanner(b)],
  ]) {
    const f = path.resolve('data', fichier);
    if (!fs.existsSync(f)) continue;
    try {
      await faire(Buffer.from(fs.readFileSync(f, 'utf8'), 'base64'));
      res[type] = 'ok';
      fs.unlinkSync(f);
    } catch (e) { res[type] = e.message; }
  }
  // Bio (« À propos de moi ») : data/bio.txt, 400 caractères max.
  const fBio = path.resolve('data', 'bio.txt');
  if (fs.existsSync(fBio)) {
    try {
      await client.application.edit({ description: fs.readFileSync(fBio, 'utf8').trim().slice(0, 400) });
      res.bio = 'ok';
      fs.unlinkSync(fBio);
    } catch (e) { res.bio = e.message; }
  }
  if (Object.keys(res).length) fs.writeFileSync(path.resolve('data', 'profil-resultat.json'), JSON.stringify({ date: new Date().toISOString(), ...res }, null, 2));
}
