import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';

// Les actualités du site viennent de 2 endroits :
//  - le fichier actualites.js du site (actus écrites à la main) ;
//  - la table « actualites » de Supabase (actus publiées depuis l'espace admin).
// Toutes les 5 minutes, le bot regarde s'il y en a une nouvelle et la poste dans le salon des actus.
export const SITE = 'https://lesnaufrages-mc.github.io/';
// Valeurs publiques (les mêmes que dans docs/supabase-config.js du site) : lecture seule.
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://updqdvsigqtsjddeshvi.supabase.co';
const SUPABASE_CLE = process.env.SUPABASE_CLE || 'sb_publishable_wvxRoVPpFIvPPrB9GTqsLQ_Q8LUArgH';
const FICHIER_VUES = path.resolve('data', 'actus-vues.json');

const CATEGORIES = {
  discord: { emoji: '💬', nom: 'Discord', couleur: 0x5865f2 },
  minecraft: { emoji: '⛏️', nom: 'Minecraft', couleur: 0x3fae5a },
  appli: { emoji: '📱', nom: 'Appli', couleur: 0xf1c40f },
  bot: { emoji: '🤖', nom: 'Bot', couleur: 0x9b59b6 },
  site: { emoji: '🌐', nom: 'Site', couleur: 0x3498db },
};

// Une actu = une clé unique : l'id Supabase, sinon la date + le titre.
export const cle = (a) => (a.id != null ? `sb:${a.id}` : `js:${a.date}:${a.titre}`);

// Lien d'actu vers une URL complète ; refuse tout ce qui n'est pas http(s) ou une page du site.
export function lienAbsolu(lien) {
  if (!lien || /[\s\\\x00-\x1f]/.test(lien)) return null;
  if (/^https?:\/\//i.test(lien)) return lien;
  if (/^[^/?#]*:/.test(lien)) return null; // javascript:, data:...
  return new URL(lien.replace(/^\//, ''), SITE).href;
}

// Lit le fichier actualites.js du site : c'est du JavaScript (var ACTUALITES = [...]),
// on l'exécute dans une bulle isolée, sans accès au reste du bot.
export function lireActusJs(code) {
  const bulle = {};
  vm.runInNewContext(code, vm.createContext(bulle), { timeout: 1000 });
  // Copie en données simples (texte, nombres...) : rien du code du site ne sort de la bulle.
  return Array.isArray(bulle.ACTUALITES) ? JSON.parse(JSON.stringify(bulle.ACTUALITES)) : [];
}

async function telechargerActus() {
  const actus = [];
  const js = await fetch(`${SITE}actualites.js`, { cache: 'no-store' }).catch(() => null);
  if (js?.ok) actus.push(...lireActusJs(await js.text()));
  const h = { apikey: SUPABASE_CLE };
  if (/^eyJ/.test(SUPABASE_CLE)) h.Authorization = `Bearer ${SUPABASE_CLE}`;
  const sb = await fetch(`${SUPABASE_URL}/rest/v1/actualites?select=id,date,categorie,titre,texte,lien,bouton&order=id.desc&limit=20`, { headers: h }).catch(() => null);
  if (sb?.ok) actus.push(...await sb.json());
  return actus.filter((a) => a?.titre && a?.texte);
}

function lireVues() {
  try {
    return JSON.parse(fs.readFileSync(FICHIER_VUES, 'utf8'));
  } catch {
    return null;
  }
}
function ecrireVues(cles) {
  fs.mkdirSync(path.dirname(FICHIER_VUES), { recursive: true });
  fs.writeFileSync(FICHIER_VUES, JSON.stringify(cles.slice(-500)));
}

// Renvoie les actus pas encore postées (les plus anciennes d'abord).
// Au tout premier passage, rien n'est posté : on retient juste ce qui existe déjà, pour ne pas inonder le salon.
export function nouvelles(actus, vues) {
  if (vues === null) return [];
  const deja = new Set(vues);
  return actus.filter((a) => !deja.has(cle(a))).reverse();
}

export function messageActu(a) {
  const cat = CATEGORIES[a.categorie] ?? CATEGORIES.site;
  const embed = new EmbedBuilder()
    .setColor(cat.couleur)
    .setAuthor({ name: `${cat.emoji} Actu ${cat.nom} · Les Naufragés` })
    .setTitle(String(a.titre).slice(0, 256))
    .setDescription(String(a.texte).slice(0, 4000))
    .setURL(`${SITE}actualites.html`)
    .setFooter({ text: 'lesnaufrages-mc.github.io' });
  if (/^\d{4}-\d{2}-\d{2}$/.test(a.date ?? '')) embed.setTimestamp(new Date(`${a.date}T12:00:00Z`));
  const image = lienAbsolu(a.image);
  if (image) embed.setImage(image);
  const boutons = new ActionRowBuilder();
  const lien = lienAbsolu(a.lien);
  if (lien) boutons.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(lien).setLabel(String(a.bouton || 'En savoir plus').slice(0, 80)));
  const video = lienAbsolu(a.video);
  if (video) boutons.addComponents(new ButtonBuilder().setStyle(ButtonStyle.Link).setURL(video).setLabel('🎬 Voir la vidéo'));
  return { embeds: [embed], components: boutons.components.length ? [boutons] : [] };
}

let enCours = false;
export async function verifierActus(client, salonId) {
  if (!salonId || enCours) return;
  enCours = true;
  try {
    const actus = await telechargerActus();
    if (!actus.length) return; // site injoignable : on réessaiera plus tard
    const vues = lireVues();
    const salon = await client.channels.fetch(salonId).catch(() => null);
    if (!salon) return console.error('Salon des actus introuvable : vérifie SALON_ACTUS_ID.');
    for (const a of nouvelles(actus, vues)) await salon.send(messageActu(a));
    ecrireVues([...new Set([...(vues ?? []), ...actus.map(cle)])]);
  } catch (e) {
    console.error('Actus :', e.message);
  } finally {
    enCours = false;
  }
}

// /actus : poste la dernière actu tout de suite (pour tester).
export async function commandeActus(i) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const actus = await telechargerActus();
  if (!actus.length) return i.editReply('😵 Je n\'arrive pas à lire les actus du site pour le moment.');
  const derniere = [...actus].sort((x, y) => String(y.date).localeCompare(String(x.date)))[0];
  await i.channel.send(messageActu(derniere));
  return i.editReply('Dernière actu postée ✅');
}
