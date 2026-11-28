import fs from 'node:fs';
import path from 'node:path';
import {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, MessageFlags, PermissionFlagsBits,
} from 'discord.js';

// Tournois à élimination directe, gérés par le bot :
//  /tournoi creer → message avec S'inscrire / Se désinscrire / Règlement
//  /tournoi lancer → tableau tiré au sort, matchs annoncés
//  /tournoi score  → un joueur déclare le résultat, l'adversaire confirme ou conteste (le staff tranche)
//  à la fin : résultats + rôle de récompense donné automatiquement au vainqueur.

const F = path.resolve('data', 'tournois.json');
const lire = () => { try { return JSON.parse(fs.readFileSync(F, 'utf8')); } catch { return {}; } };
const ecrire = (d) => { fs.mkdirSync('data', { recursive: true }); fs.writeFileSync(F, JSON.stringify(d, null, 1)); };
const estStaff = (m) => m.permissions.has(PermissionFlagsBits.ManageEvents) || m.permissions.has(PermissionFlagsBits.ManageGuild);

// ---------------------------------------------------------------------------
// Logique pure (testée)
// ---------------------------------------------------------------------------
export function melanger(t, alea = Math.random) {
  const a = [...t];
  for (let k = a.length - 1; k > 0; k--) { const j = Math.floor(alea() * (k + 1)); [a[k], a[j]] = [a[j], a[k]]; }
  return a;
}

// Premier tour : complété par des « exempts » (null) jusqu'à une puissance de 2 ; un exempt fait passer l'autre.
export function premierTour(joueurs) {
  let n = 1; while (n < joueurs.length) n *= 2;
  const places = [...joueurs, ...Array(n - joueurs.length).fill(null)];
  // les exempts sont répartis : joueur k contre exempt avant de mettre deux joueurs ensemble
  const tete = places.slice(0, n / 2); const queue = places.slice(n / 2).reverse();
  return tete.map((a, k) => avancerSiExempt({ a, b: queue[k] ?? null, gagnant: null }));
}
const avancerSiExempt = (m) => (m.b === null && m.a !== null ? { ...m, gagnant: m.a, score: 'exempt' } : m.a === null && m.b !== null ? { ...m, gagnant: m.b, score: 'exempt' } : m);

export function tourSuivant(tour) {
  if (tour.length < 2 || tour.some((m) => !m.gagnant)) return null;
  const s = [];
  for (let k = 0; k < tour.length; k += 2) s.push(avancerSiExempt({ a: tour[k].gagnant, b: tour[k + 1].gagnant, gagnant: null }));
  return s;
}

export const nomTour = (taille) => ({ 1: 'Finale', 2: 'Demi-finales', 4: 'Quarts de finale', 8: 'Huitièmes de finale' })[taille] ?? `Tour à ${taille * 2}`;

// Trouve le match en cours d'un joueur.
export function matchDe(t, joueurId) {
  const r = t.tours.length - 1;
  const k = (t.tours[r] ?? []).findIndex((m) => !m.gagnant && (m.a === joueurId || m.b === joueurId));
  return k < 0 ? null : { r, k, m: t.tours[r][k] };
}

// Valide un résultat ; renvoie 'suivant' (nouveau tour), 'fini' ou 'ok'.
export function valider(t, r, k, gagnant, score) {
  const m = t.tours[r][k];
  m.gagnant = gagnant; m.score = score; delete m.declare;
  const s = tourSuivant(t.tours[r]);
  if (t.tours[r].length === 1) { t.statut = 'fini'; t.champion = gagnant; return 'fini'; }
  if (s) { t.tours.push(s); if (s.length === 1 && s[0].gagnant) { t.statut = 'fini'; t.champion = s[0].gagnant; return 'fini'; } return 'suivant'; }
  return 'ok';
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------
const j = (id) => (id ? `<@${id}>` : '*exempt*');
function embedInscriptions(t) {
  return new EmbedBuilder().setColor(0xf1c40f).setTitle(`🏆 ${t.nom}`)
    .setDescription(t.description || 'Le tournoi des Naufragés !')
    .addFields(
      { name: '🎮 Jeu', value: t.jeu, inline: true },
      { name: '⚔️ Format', value: `Élimination directe · ${t.format}`, inline: true },
      { name: '👥 Participants', value: `${t.joueurs.length} / ${t.places}`, inline: true },
      { name: '🎁 Récompense', value: t.recompense ? `1re place : <@&${t.recompense}>` : 'La gloire éternelle', inline: true },
      { name: '📋 Statut', value: t.statut === 'inscriptions' ? '🟢 Inscriptions ouvertes' : t.statut === 'en_cours' ? '🔥 En cours' : '🏁 Terminé', inline: true },
    )
    .setFooter({ text: `Tournoi n°${t.id}` });
}
const boutonsInscription = (t, actif = true) => [new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`tournoi:ins:${t.id}`).setLabel('S\'inscrire').setStyle(ButtonStyle.Success).setDisabled(!actif),
  new ButtonBuilder().setCustomId(`tournoi:des:${t.id}`).setLabel('Se désinscrire').setStyle(ButtonStyle.Secondary).setDisabled(!actif),
  new ButtonBuilder().setCustomId(`tournoi:reg:${t.id}`).setLabel('Règlement').setStyle(ButtonStyle.Primary),
)];
export function tableau(t) {
  return t.tours.map((tour) => `**${nomTour(tour.length)}**\n${tour.map((m) => `${m.gagnant === m.a && m.a ? '✅ ' : ''}${j(m.a)} vs ${j(m.b)}${m.gagnant === m.b && m.b ? ' ✅' : ''}${m.score && m.score !== 'exempt' ? ` · ${m.score}` : ''}`).join('\n')}`).join('\n\n');
}

async function salonDe(client, t) { return client.channels.fetch(t.salon).catch(() => null); }
async function majMessage(client, t) {
  const s = await salonDe(client, t);
  const msg = s && await s.messages.fetch(t.message).catch(() => null);
  if (msg) await msg.edit({ embeds: [embedInscriptions(t)], components: boutonsInscription(t, t.statut === 'inscriptions') }).catch(() => {});
}
async function annoncerTour(client, t) {
  const s = await salonDe(client, t);
  const tour = t.tours.at(-1);
  const aJouer = tour.filter((m) => !m.gagnant);
  await s?.send({
    content: aJouer.flatMap((m) => [m.a, m.b]).filter(Boolean).map((x) => `<@${x}>`).join(' ') || undefined,
    embeds: [new EmbedBuilder().setColor(0x3498db).setTitle(`⚔️ ${t.nom} · ${nomTour(tour.length)}`)
      .setDescription(`${tour.map((m) => `${j(m.a)} vs ${j(m.b)}${m.gagnant ? ' (exempt, qualifié)' : ''}`).join('\n')}\n\n`
        + `Format **${t.format}**. Une fois le match joué, le gagnant tape \`/tournoi score\` et l'adversaire confirme.`)],
  }).catch(() => {});
}
async function terminer(client, guild, t) {
  const s = await salonDe(client, t);
  const finale = t.tours.at(-1)[0];
  const second = finale.a === t.champion ? finale.b : finale.a;
  if (t.recompense) {
    const m = await guild.members.fetch(t.champion).catch(() => null);
    await m?.roles.add(t.recompense, `Vainqueur de ${t.nom}`).catch((e) => console.error('Récompense tournoi :', e.message));
  }
  await s?.send({
    content: `🏆 Bravo <@${t.champion}> !`,
    embeds: [new EmbedBuilder().setColor(0xf1c40f).setTitle(`🏆 ${t.nom} · Résultats`)
      .setDescription(`🥇 **1re place** · <@${t.champion}>${t.recompense ? ` (reçoit <@&${t.recompense}>)` : ''}\n🥈 **2e place** · ${j(second)}\n\n${tableau(t)}`)],
    allowedMentions: { users: [t.champion] },
  }).catch(() => {});
  await majMessage(client, t);
}

// ---------------------------------------------------------------------------
// Commandes et boutons
// ---------------------------------------------------------------------------
async function commandeTournoi(i) {
  const sous = i.options.getSubcommand();
  const d = lire();
  if (sous === 'creer') {
    if (!estStaff(i.member)) return i.reply({ content: '⛔ Réservé au staff (Gérer les événements).', flags: MessageFlags.Ephemeral });
    const id = String((Math.max(0, ...Object.keys(d).map(Number)) || 0) + 1);
    const t = {
      id, nom: i.options.getString('nom'), jeu: i.options.getString('jeu'), places: i.options.getInteger('places') ?? 16,
      format: i.options.getString('format') ?? 'BO1', recompense: i.options.getRole('recompense')?.id ?? null,
      description: i.options.getString('description') ?? '', regles: i.options.getString('regles') ?? '',
      statut: 'inscriptions', joueurs: [], tours: [], salon: i.channelId, createur: i.user.id,
    };
    await i.reply({ embeds: [embedInscriptions(t)], components: boutonsInscription(t) });
    t.message = (await i.fetchReply()).id;
    d[id] = t; ecrire(d);
    return;
  }
  const t = d[i.options.getString('id') ?? ''] ?? Object.values(d).filter((x) => x.statut !== 'fini' && x.salon === i.channelId).at(-1)
    ?? Object.values(d).filter((x) => x.statut !== 'fini').at(-1);
  if (!t) return i.reply({ content: 'Aucun tournoi en cours. `/tournoi creer` pour en lancer un !', flags: MessageFlags.Ephemeral });

  if (sous === 'voir') {
    return i.reply({ embeds: [embedInscriptions(t).addFields({ name: 'Tableau', value: (t.tours.length ? tableau(t) : t.joueurs.map(j).join(', ') || 'Personne encore').slice(0, 1024) })], allowedMentions: { users: [] } });
  }
  if (!['score'].includes(sous) && !estStaff(i.member)) return i.reply({ content: '⛔ Réservé au staff.', flags: MessageFlags.Ephemeral });

  if (sous === 'lancer') {
    if (t.statut !== 'inscriptions') return i.reply({ content: 'Ce tournoi est déjà lancé.', flags: MessageFlags.Ephemeral });
    if (t.joueurs.length < 2) return i.reply({ content: 'Il faut au moins 2 inscrits.', flags: MessageFlags.Ephemeral });
    t.statut = 'en_cours';
    t.tours = [premierTour(melanger(t.joueurs))];
    ecrire(d);
    await i.reply({ content: `🚀 **${t.nom}** est lancé avec ${t.joueurs.length} joueurs !` });
    await majMessage(i.client, t);
    return annoncerTour(i.client, t);
  }
  if (sous === 'annuler') {
    delete d[t.id]; ecrire(d);
    t.statut = 'fini';
    await majMessage(i.client, t);
    return i.reply({ content: `🗑️ Tournoi **${t.nom}** annulé.` });
  }
  if (sous === 'score') {
    if (t.statut !== 'en_cours') return i.reply({ content: 'Le tournoi n\'a pas commencé.', flags: MessageFlags.Ephemeral });
    const gagnant = i.options.getUser('gagnant');
    const score = i.options.getString('score');
    const trouve = matchDe(t, gagnant.id);
    if (!trouve) return i.reply({ content: `${gagnant} n'a pas de match en cours.`, flags: MessageFlags.Ephemeral });
    const { r, k, m } = trouve;
    const adversaire = m.a === gagnant.id ? m.b : m.a;
    if (estStaff(i.member) && ![m.a, m.b].includes(i.user.id)) {
      return resultat(i, d, t, r, k, gagnant.id, score, `✅ Résultat validé par le staff : ${j(gagnant.id)} gagne ${score}.`);
    }
    if (![m.a, m.b].includes(i.user.id)) return i.reply({ content: 'Seuls les deux joueurs du match (ou le staff) peuvent déclarer le score.', flags: MessageFlags.Ephemeral });
    const autre = i.user.id === m.a ? m.b : m.a;
    m.declare = { par: i.user.id, gagnant: gagnant.id, score };
    ecrire(d);
    return i.reply({
      content: `<@${autre}>, ${i.user} déclare : **${j(gagnant.id)} gagne ${score}** contre ${j(adversaire)}. Tu confirmes ?`,
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`tournoi:ok:${t.id}:${r}:${k}`).setLabel('Confirmer').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId(`tournoi:non:${t.id}:${r}:${k}`).setLabel('Contester').setStyle(ButtonStyle.Danger),
      )],
      allowedMentions: { users: [autre] },
    });
  }
  return null;
}

async function resultat(i, d, t, r, k, gagnant, score, texte) {
  const etat = valider(t, r, k, gagnant, score);
  ecrire(d);
  await (i.isButton() ? i.update({ content: texte, components: [] }) : i.reply({ content: texte, allowedMentions: { users: [] } }));
  if (etat === 'suivant') await annoncerTour(i.client, t);
  if (etat === 'fini') await terminer(i.client, i.guild, t);
}

export async function interactionTournoi(i) {
  if (!i.isButton() || !i.customId.startsWith('tournoi:')) return false;
  const [, action, id, r, k] = i.customId.split(':');
  const d = lire();
  const t = d[id];
  if (!t) { await i.reply({ content: 'Ce tournoi n\'existe plus.', flags: MessageFlags.Ephemeral }); return true; }
  if (action === 'reg') {
    await i.reply({ content: `📜 **Règlement · ${t.nom}**\n${t.regles || `• Élimination directe en ${t.format}\n• Le gagnant déclare le score avec \`/tournoi score\`, l'adversaire confirme\n• En cas de désaccord, le staff tranche\n• Fair-play obligatoire`}`, flags: MessageFlags.Ephemeral });
    return true;
  }
  if (action === 'ins' || action === 'des') {
    if (t.statut !== 'inscriptions') { await i.reply({ content: 'Les inscriptions sont fermées.', flags: MessageFlags.Ephemeral }); return true; }
    const dedans = t.joueurs.includes(i.user.id);
    if (action === 'ins') {
      if (dedans) { await i.reply({ content: 'Tu es déjà inscrit 👍', flags: MessageFlags.Ephemeral }); return true; }
      if (t.joueurs.length >= t.places) { await i.reply({ content: 'Complet !', flags: MessageFlags.Ephemeral }); return true; }
      t.joueurs.push(i.user.id);
    } else {
      if (!dedans) { await i.reply({ content: 'Tu n\'es pas inscrit.', flags: MessageFlags.Ephemeral }); return true; }
      t.joueurs = t.joueurs.filter((x) => x !== i.user.id);
    }
    ecrire(d);
    await i.update({ embeds: [embedInscriptions(t)], components: boutonsInscription(t) });
    await i.followUp({ content: action === 'ins' ? `✅ Inscription confirmée à **${t.nom}**. Bonne chance !` : '👋 Désinscription faite.', flags: MessageFlags.Ephemeral });
    return true;
  }
  const m = t.tours[Number(r)]?.[Number(k)];
  if (!m?.declare || m.gagnant) { await i.reply({ content: 'Ce résultat a déjà été traité.', flags: MessageFlags.Ephemeral }); return true; }
  const autre = m.declare.par === m.a ? m.b : m.a;
  if (i.user.id !== autre && !estStaff(i.member)) { await i.reply({ content: 'C\'est à l\'adversaire de répondre.', flags: MessageFlags.Ephemeral }); return true; }
  if (action === 'ok') {
    await resultat(i, d, t, Number(r), Number(k), m.declare.gagnant, m.declare.score, `✅ Résultat confirmé : ${j(m.declare.gagnant)} gagne ${m.declare.score}.`);
    return true;
  }
  if (action === 'non') {
    await i.update({ content: `⚠️ **Litige** sur le match ${j(m.a)} vs ${j(m.b)} (déclaré : ${j(m.declare.gagnant)} ${m.declare.score}). Un membre du staff va trancher avec \`/tournoi score\`.`, components: [] });
    return true;
  }
  return false;
}

export const actionsTournoi = { tournoi: commandeTournoi };
