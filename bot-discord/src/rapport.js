import fs from 'node:fs';
import path from 'node:path';
import { EmbedBuilder, MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { posterMc, embedNote, SIGNATURE, SALON_MC } from './annonces-mc.js';

// Rapport hebdomadaire du serveur Minecraft.
//  - Pendant la semaine, le staff note les changements avec /changelog ajouter (ou on les écrit dans data/changelog.json).
//  - Chaque lundi à 9 h (heure de Bruxelles), le bot poste un rapport soigné dans le salon du rapport :
//    nouveautés, améliorations, correctifs, événements, à venir, + les chiffres de la semaine.
//  - Les notes publiées partent ensuite dans data/changelog-archive.json.
const env = process.env;
export const RAPPORT = {
  salon: env.SALON_RAPPORT_ID || '848250939751137371',
  heure: Number(env.RAPPORT_HEURE ?? 9),
  adresse: env.MC_ADRESSE || 'naufragesmc.mine.fun',
};
const DOSSIER = path.resolve('data');
const F_NOTES = path.join(DOSSIER, 'changelog.json');
const F_ARCHIVE = path.join(DOSSIER, 'changelog-archive.json');
const F_ETAT = path.join(DOSSIER, 'rapport.json');
const F_STATS = path.join(DOSSIER, 'stats-semaine.json');
const ZONE = 'Europe/Brussels';

export const TYPES = {
  nouveaute: { emoji: '✨', titre: 'Nouveautés', couleur: 0x3fae5a },
  amelioration: { emoji: '🔧', titre: 'Améliorations', couleur: 0x3498db },
  correctif: { emoji: '🛠️', titre: 'Correctifs', couleur: 0xe67e22 },
  evenement: { emoji: '🎉', titre: 'Événements', couleur: 0xe91e63 },
  avenir: { emoji: '🔭', titre: 'À venir', couleur: 0x9b59b6 },
};
const OR = 0xc9a227;

const lireJson = (f, defaut) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return defaut; } };
const ecrireJson = (f, d) => { fs.mkdirSync(DOSSIER, { recursive: true }); fs.writeFileSync(f, JSON.stringify(d, null, 2)); };

// --- Dates à l'heure de Bruxelles ---
export function partiesBxl(date = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23', weekday: 'short',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  return { iso: `${p.year}-${p.month}-${p.day}`, heure: Number(p.hour), lundi: p.weekday === 'Mon' };
}
// Numéro de semaine ISO (ex. « 2026-W47 ») d'une date AAAA-MM-JJ.
export function semaineIso(iso) {
  const d = new Date(`${iso}T12:00:00Z`);
  const jour = (d.getUTCDay() + 6) % 7; // lundi = 0
  d.setUTCDate(d.getUTCDate() - jour + 3); // jeudi de la semaine
  const annee = d.getUTCFullYear();
  const premierJeudi = new Date(Date.UTC(annee, 0, 4));
  const n = 1 + Math.round(((d - premierJeudi) / 86400000 - 3 + ((premierJeudi.getUTCDay() + 6) % 7)) / 7);
  return `${annee}-W${String(n).padStart(2, '0')}`;
}
const decaler = (iso, jours) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + jours); return d.toISOString().slice(0, 10); };
export const dateLongue = (iso, annee = false) => new Intl.DateTimeFormat('fr-BE', {
  day: 'numeric', month: 'long', ...(annee ? { year: 'numeric' } : {}), timeZone: 'UTC',
}).format(new Date(`${iso}T12:00:00Z`));

// --- Notes de la semaine ---
export const lireNotes = () => lireJson(F_NOTES, []);
export function ajouterNote(type, titre, texte, auteur = 'Staff', date = partiesBxl().iso) {
  if (!TYPES[type]) throw new Error(`type inconnu : ${type}`);
  const notes = lireNotes();
  notes.push({ date, type, titre: titre.trim(), texte: texte.trim(), auteur });
  ecrireJson(F_NOTES, notes);
  return notes.length;
}
export function retirerNote(numero) {
  const notes = lireNotes();
  if (numero < 1 || numero > notes.length) return null;
  const [n] = notes.splice(numero - 1, 1);
  ecrireJson(F_NOTES, notes);
  return n;
}

// --- Chiffres de la semaine (appelé à chaque ping du serveur, chaque minute) ---
let stats = null;
let nbDepuisSauvegarde = 0;
export function noterMesure(mesure, maintenant = new Date()) {
  stats ??= lireJson(F_STATS, null) ?? { debut: maintenant.toISOString(), mesures: 0, enLigne: 0, pic: 0, picLe: null, joueursVus: [] };
  stats.mesures += 1;
  if (mesure) {
    stats.enLigne += 1;
    if (mesure.joueurs > stats.pic) { stats.pic = mesure.joueurs; stats.picLe = maintenant.toISOString(); }
    for (const nom of mesure.noms ?? []) if (!stats.joueursVus.includes(nom) && stats.joueursVus.length < 500) stats.joueursVus.push(nom);
  }
  if (++nbDepuisSauvegarde >= 10) { nbDepuisSauvegarde = 0; ecrireJson(F_STATS, stats); }
}
function lireStats() { return stats ?? lireJson(F_STATS, null); }
function remettreStats() { stats = null; nbDepuisSauvegarde = 0; try { fs.unlinkSync(F_STATS); } catch { /* rien */ } }

// --- Construction du rapport ---
const MAX_DESC = 3900;
// Coupe une liste de blocs de texte en morceaux qui tiennent dans une description d'embed.
function decouper(blocs) {
  const morceaux = [];
  let courant = '';
  for (const b of blocs) {
    const bloc = b.length > MAX_DESC ? `${b.slice(0, MAX_DESC - 1)}…` : b;
    if (courant && courant.length + bloc.length + 2 > MAX_DESC) { morceaux.push(courant); courant = ''; }
    courant = courant ? `${courant}\n\n${bloc}` : bloc;
  }
  if (courant) morceaux.push(courant);
  return morceaux;
}

export function construireRapport(notes, { debut, fin, numero, stats: st } = {}) {
  const embeds = [];
  const compte = Object.keys(TYPES).map((t) => [t, notes.filter((n) => n.type === t).length]).filter(([, n]) => n);
  const resume = compte.map(([t, n]) => `${TYPES[t].emoji} ${n} ${TYPES[t].titre.toLowerCase()}`).join(' · ');
  embeds.push(new EmbedBuilder()
    .setColor(OR)
    .setTitle(`📋 Rapport hebdomadaire${numero ? ` n°${numero}` : ''} · Serveur Minecraft`)
    .setDescription([
      `**Période : du ${dateLongue(debut)} au ${dateLongue(fin, true)}**`,
      '',
      'Bonjour à toutes et à tous,',
      'voici le point hebdomadaire sur l\'évolution du serveur **Les Naufragés** : ce qui a été ajouté, ce qui a été amélioré, '
      + 'ce qui a été corrigé, et ce qui se prépare pour les semaines à venir. Chaque point est expliqué pour que vous sachiez '
      + 'concrètement ce qui change pour vous en jeu.',
      '',
      resume ? `**En bref :** ${resume}` : '**En bref :** semaine calme, sans changement majeur sur le serveur.',
    ].join('\n')));

  for (const [type, def] of Object.entries(TYPES)) {
    const liste = notes.filter((n) => n.type === type);
    if (!liste.length) continue;
    const blocs = liste.map((n) => `**▸ ${n.titre}**\n${n.texte}`);
    decouper(blocs).forEach((desc, k) => embeds.push(new EmbedBuilder()
      .setColor(def.couleur)
      .setTitle(`${def.emoji} ${def.titre}${k ? ' (suite)' : ''}`)
      .setDescription(desc)));
  }

  const lignes = [];
  if (st && st.mesures >= 60) {
    const dispo = Math.round((st.enLigne / st.mesures) * 1000) / 10;
    lignes.push(`🟢 **Disponibilité du serveur :** ${String(dispo).replace('.', ',')} %`);
    lignes.push(`👥 **Pic de joueurs connectés :** ${st.pic}`);
    if (st.joueursVus?.length) lignes.push(`🧭 **Joueurs différents aperçus :** ${st.joueursVus.length}${st.joueursVus.length >= 12 ? '+' : ''}`);
  }
  lignes.push(`🌐 **Adresse :** \`${RAPPORT.adresse}\` (Java et Bedrock)`);
  lignes.push('', 'Une question, une idée ou un bug à signaler ? Le staff vous répond sur le Discord. Merci à chacun pour votre présence, '
    + 'vos retours et votre patience : c\'est grâce à vous que le serveur avance. Bon jeu et bonne semaine ! ⚓');
  embeds.push(new EmbedBuilder()
    .setColor(OR)
    .setTitle('📊 Le serveur en chiffres')
    .setDescription(lignes.join('\n'))
    .setFooter({ text: 'Les Naufragés · Rapport publié chaque lundi par le staff' })
    .setTimestamp(new Date()));
  return embeds;
}

// Regroupe les embeds par messages (10 embeds et ~6000 caractères maximum par message Discord).
export function grouperMessages(embeds) {
  const messages = [];
  let lot = []; let taille = 0;
  for (const e of embeds) {
    const t = (e.data.title?.length ?? 0) + (e.data.description?.length ?? 0) + (e.data.footer?.text?.length ?? 0);
    if (lot.length && (lot.length >= 10 || taille + t > 5800)) { messages.push(lot); lot = []; taille = 0; }
    lot.push(e); taille += t;
  }
  if (lot.length) messages.push(lot);
  return messages;
}

function periode(notes, etat, aujourdhui) {
  const fin = partiesBxl().lundi ? decaler(aujourdhui, -1) : aujourdhui;
  const premiere = notes.map((n) => n.date).sort()[0];
  let debut = etat.dernierLe ?? premiere ?? decaler(fin, -6);
  if (debut > fin) debut = fin;
  return { debut, fin };
}

// Publie le rapport dans le salon, archive les notes et remet les chiffres à zéro.
export async function publierRapport(client) {
  const salon = await client.channels.fetch(RAPPORT.salon).catch(() => null);
  if (!salon?.isTextBased()) { console.error('Salon du rapport introuvable : vérifie SALON_RAPPORT_ID.'); return false; }
  const etat = lireJson(F_ETAT, {});
  const notes = lireNotes();
  const { iso } = partiesBxl();
  const { debut, fin } = periode(notes, etat, iso);
  const numero = (etat.numero ?? 0) + 1;
  for (const lot of grouperMessages(construireRapport(notes, { debut, fin, numero, stats: lireStats() }))) {
    await salon.send({ embeds: lot });
  }
  const archive = lireJson(F_ARCHIVE, []);
  archive.push({ numero, publieLe: iso, debut, fin, notes });
  ecrireJson(F_ARCHIVE, archive);
  ecrireJson(F_NOTES, []);
  ecrireJson(F_ETAT, { numero, semaine: semaineIso(iso), dernierLe: iso });
  remettreStats();
  // Plus d'annonce « Rapport hebdomadaire disponible » dans le salon du serveur Minecraft (retirée à la demande du fondateur, 2026-11-23).
  console.log(`📋 Rapport hebdomadaire n°${numero} publié`);
  return true;
}

// Efface une fois les anciennes annonces « 📋 Rapport hebdomadaire n°X disponible » postées par le bot dans le salon Minecraft.
let anciennesEffacees = false;
async function effacerAnciennesAnnonces(client) {
  if (anciennesEffacees) return;
  anciennesEffacees = true;
  try {
    const salon = await client.channels.fetch(SALON_MC).catch(() => null);
    if (!salon?.isTextBased()) return;
    const messages = await salon.messages.fetch({ limit: 100 });
    for (const m of messages.values()) {
      if (m.author.id !== client.user.id) continue;
      if (!m.embeds.some((e) => /^📋 Rapport hebdomadaire n°\d+ disponible/.test(e.title ?? ''))) continue;
      await m.delete().catch((e) => console.error('Suppression annonce rapport :', e.message));
      console.log('🗑️ Annonce « Rapport hebdomadaire disponible » effacée du salon Minecraft');
    }
  } catch (e) {
    console.error('Nettoyage annonces rapport :', e.message);
  }
}

// Vérifié chaque minute : le lundi à partir de 9 h, une seule fois par semaine.
// Au tout premier lancement (aucun rapport encore publié), un premier rapport part tout de suite s'il y a des notes.
let enCours = false;
export async function verifierRapport(client) {
  if (enCours) return;
  enCours = true;
  try {
    await effacerAnciennesAnnonces(client);
    await posterMisesAJour(client);
    await posterFichiers(client);
    await lireSalons(client);
    const etat = lireJson(F_ETAT, {});
    const { iso, heure, lundi } = partiesBxl();
    const premier = !etat.numero && lireNotes().length > 0;
    const cetteSemaine = lundi && heure >= RAPPORT.heure && etat.semaine !== semaineIso(iso);
    if (premier || cetteSemaine) await publierRapport(client);
  } catch (e) {
    console.error('Rapport :', e.message);
  } finally {
    enCours = false;
  }
}

// --- Mises à jour déposées dans data/a-annoncer.json (par le staff ou à distance) ---
// Format : [{ titre, intro?, notes: [{ type, titre, texte }], bientot?: [texte], mentionner?: true, rapport?: true }]
// Le bot poste une annonce « Mise à jour du serveur » dans le salon Minecraft, ajoute les notes au rapport du lundi,
// puis vide le fichier.
const F_A_ANNONCER = path.join(DOSSIER, 'a-annoncer.json');
export function embedMiseAJour(maj) {
  const blocs = (maj.notes ?? []).map((n) => `${TYPES[n.type]?.emoji ?? '▸'} **${n.titre}**\n${n.texte}`);
  if (maj.bientot?.length) blocs.push(`🔭 **Prochainement**\n${maj.bientot.join('\n')}`);
  return new EmbedBuilder().setColor(0x3fae5a)
    .setTitle(String(maj.titre || 'Mise à jour du serveur Minecraft').slice(0, 256))
    .setDescription([maj.intro, ...blocs, '_Ces changements seront repris dans le rapport hebdomadaire du lundi._'].filter(Boolean).join('\n\n').slice(0, 4000))
    .setFooter({ text: SIGNATURE }).setTimestamp(new Date());
}
async function posterMisesAJour(client) {
  const liste = lireJson(F_A_ANNONCER, null);
  if (!Array.isArray(liste) || !liste.length) return;
  ecrireJson(F_A_ANNONCER, []);
  for (const maj of liste) {
    await posterMc(client, { embeds: [embedMiseAJour(maj)] }, { mentionner: maj.mentionner !== false });
    if (maj.rapport !== false) for (const n of maj.notes ?? []) if (TYPES[n.type]) ajouterNote(n.type, n.titre, n.texte, 'Staff');
    console.log(`📢 Mise à jour annoncée : ${maj.titre}`);
  }
}

// --- Messages avec fichiers déposés dans data/a-poster.json (à distance, sans toucher au code) ---
// Format : [{ salon: "<id>", titre?, texte?, couleur?, contenu?, fichiers?: [{ nom: "Guide.pdf", base64: "data/fichier.b64" }] }]
// Le bot poste chaque message dans son salon, joint les fichiers (décodés depuis le base64), puis vide le fichier
// et supprime les .b64 envoyés.
const F_A_POSTER = path.join(DOSSIER, 'a-poster.json');
// --- Lecture d'un salon à distance : data/a-lire.json = [{ salon: "<id>", limite?: 100 }] ---
// Le bot écrit data/lu-<id>.json (auteur, date, texte, titres et textes des embeds, pièces jointes), puis vide a-lire.json.
const F_A_LIRE = path.join(DOSSIER, 'a-lire.json');
async function lireSalons(client) {
  const liste = lireJson(F_A_LIRE, null);
  if (!Array.isArray(liste) || !liste.length) return;
  ecrireJson(F_A_LIRE, []);
  for (const d of liste) {
    try {
      const id = String(d.salon).replace(/\D/g, '');
      const salon = await client.channels.fetch(id);
      const voulus = Math.min(Number(d.limite) || 100, 500);
      const tous = [];
      let avant;
      while (tous.length < voulus) {
        const lot = await salon.messages.fetch({ limit: Math.min(100, voulus - tous.length), before: avant });
        if (!lot.size) break;
        tous.push(...lot.values());
        avant = lot.last().id;
      }
      const sortie = tous.reverse().map(m => ({
        id: m.id, auteur: m.author?.username, bot: m.author?.bot, date: m.createdAt?.toISOString(), epingle: m.pinned,
        texte: m.content,
        embeds: m.embeds.map(e => ({ titre: e.title, texte: e.description, champs: e.fields?.map(f => ({ nom: f.name, valeur: f.value })) })),
        fichiers: [...m.attachments.values()].map(a => a.name),
      }));
      ecrireJson(path.join(DOSSIER, `lu-${id}.json`), { salon: salon.name, lu: new Date().toISOString(), messages: sortie });
      console.log(`📖 ${sortie.length} messages lus dans #${salon.name}`);
    } catch (e) {
      console.error('a-lire :', e.message);
    }
  }
}

async function posterFichiers(client) {
  const liste = lireJson(F_A_POSTER, null);
  if (!Array.isArray(liste) || !liste.length) return;
  ecrireJson(F_A_POSTER, []);
  for (const m of liste) {
    try {
      const salon = await client.channels.fetch(String(m.salon));
      const files = [];
      for (const f of m.fichiers ?? []) {
        const src = path.resolve(String(f.base64));
        if (!src.startsWith(DOSSIER + path.sep)) continue;
        files.push({ attachment: Buffer.from(fs.readFileSync(src, 'utf8'), 'base64'), name: String(f.nom).slice(0, 100) });
      }
      const embeds = (m.titre || m.texte) ? [new EmbedBuilder().setColor(m.couleur ?? 0xd4a017)
        .setTitle(String(m.titre ?? '').slice(0, 256) || null).setDescription(String(m.texte ?? '').slice(0, 4000) || null)
        .setFooter({ text: SIGNATURE }).setTimestamp(new Date())] : [];
      // bouton: "reglement" ajoute le bouton « J'accepte le règlement » (géré par roles.js : donne Membre).
      const components = m.bouton === 'reglement' ? [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('reglement:ok').setLabel('J\'accepte le règlement').setEmoji('✅').setStyle(ButtonStyle.Success))] : [];
      await salon.send({ content: m.contenu ? String(m.contenu).slice(0, 2000) : undefined, embeds, files, components });
      for (const f of m.fichiers ?? []) { try { fs.unlinkSync(path.resolve(String(f.base64))); } catch {} }
      console.log(`📎 Message avec fichiers posté dans #${salon.name ?? m.salon}`);
    } catch (e) {
      console.error('a-poster :', e.message);
    }
  }
}

// --- Commandes ---
export async function commandeChangelog(i) {
  const sous = i.options.getSubcommand();
  if (sous === 'ajouter') {
    const n = ajouterNote(i.options.getString('type'), i.options.getString('titre'), i.options.getString('explication'), i.member?.displayName ?? i.user.username);
    const annoncer = i.options.getBoolean('annoncer') ?? true;
    if (annoncer) await posterMc(i.client, { embeds: [embedNote(lireNotes()[n - 1])] }, { mentionner: i.options.getString('type') !== 'correctif' });
    return i.reply({ content: `✅ Noté (n°${n})${annoncer ? ', annoncé dans le salon du serveur Minecraft' : ''}. Ce point apparaîtra dans le rapport de lundi.`, flags: MessageFlags.Ephemeral });
  }
  if (sous === 'retirer') {
    const n = retirerNote(i.options.getInteger('numero'));
    return i.reply({ content: n ? `🗑️ Retiré : « ${n.titre} »` : 'Numéro introuvable (voir `/changelog voir`).', flags: MessageFlags.Ephemeral });
  }
  const notes = lireNotes();
  const texte = notes.map((n, k) => `**${k + 1}.** ${TYPES[n.type]?.emoji ?? '•'} ${n.titre} · _${n.date}_`).join('\n') || 'Aucun point noté pour le prochain rapport.';
  return i.reply({ content: `**Prochain rapport (lundi ${RAPPORT.heure} h)**\n${texte}`.slice(0, 2000), flags: MessageFlags.Ephemeral });
}

export async function commandeRapport(i) {
  if (i.options.getBoolean('publier')) {
    await i.deferReply({ flags: MessageFlags.Ephemeral });
    const ok = await publierRapport(i.client);
    return i.editReply(ok ? `✅ Rapport publié dans <#${RAPPORT.salon}>.` : '❌ Salon du rapport introuvable.');
  }
  const notes = lireNotes();
  const { debut, fin } = periode(notes, lireJson(F_ETAT, {}), partiesBxl().iso);
  const lots = grouperMessages(construireRapport(notes, { debut, fin, stats: lireStats() }));
  await i.reply({ content: '👀 Aperçu (visible par toi seul) :', embeds: lots[0], flags: MessageFlags.Ephemeral });
  for (const lot of lots.slice(1)) await i.followUp({ embeds: lot, flags: MessageFlags.Ephemeral });
}
