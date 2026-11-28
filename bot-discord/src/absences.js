import fs from 'node:fs';
import path from 'node:path';
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, ModalBuilder, TextInputBuilder,
  TextInputStyle, PermissionFlagsBits,
} from 'discord.js';
import { GRADES, STAFF_DECIDEUR } from './staff.js';

// ============================================================================
// Absences du staff
// Un membre du staff déclare ses dates d'absence avec un bouton, les responsables
// acceptent ou refusent, et le bot lui met le rôle « 🌴 En absence » pendant la
// période (affiché à part dans la liste des membres : tout le monde le voit),
// puis le retire tout seul à la fin.
// Règles : 10 jours max, jusqu'à 60 jours à l'avance, jusqu'à 2 jours après le
// début, une seule demande en attente, pas d'absences qui se chevauchent,
// 2 prolongations max (validées de la même façon). Heures de Bruxelles/Paris.
// ============================================================================

const JOUR = 86_400_000;
export const REGLES = { dureeMax: 10, avanceMax: 60, retardMax: 2, prolongationsMax: 2 };
export const NOM_ROLE = '🌴 En absence';
const COULEUR = 0x22d3a6;
const ORANGE = 0xf59e0b;
const ROUGE = 0xef4444;
const GRIS = 0x7f8c8d;

// --- Sauvegarde : data/absences.json ---
const F_DATA = path.resolve('data', 'absences.json');
export function lireData() {
  try {
    const d = JSON.parse(fs.readFileSync(F_DATA, 'utf8'));
    return { prochainId: d.prochainId ?? 1, liste: d.liste ?? [], reglages: d.reglages ?? {} };
  } catch { return { prochainId: 1, liste: [], reglages: {} }; }
}
function ecrireData(d) {
  fs.mkdirSync(path.dirname(F_DATA), { recursive: true });
  fs.writeFileSync(F_DATA, JSON.stringify(d, null, 2));
}

// --- Dates : saisies en heure de Bruxelles/Paris, stockées en millisecondes UTC ---
function decalageParis(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - Math.floor(ms / 1000) * 1000;
}
export function heureParisVersUtc(an, mois, jour, h, mi) {
  const local = Date.UTC(an, mois - 1, jour, h, mi);
  let ms = local - decalageParis(local);
  ms = local - decalageParis(ms);
  return ms;
}
function partiesParis(ms) {
  const d = new Date(ms + decalageParis(ms));
  return { an: d.getUTCFullYear(), mois: d.getUTCMonth() + 1, jour: d.getUTCDate() };
}

// Accepte « 19/12/2026 10:00 », « 19/12 10h », « 19-12-2026 », « 19/12 », « maintenant », « demain 9h »…
// Sans heure : 00:00 pour un début, 23:59 pour une fin.
export function lireDate(texte, { fin = false, maintenant = Date.now() } = {}) {
  const t = String(texte ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return null;
  if (['maintenant', 'now', 'tout de suite', 'direct'].includes(t)) return maintenant;
  const heure = /(?:^|\s|à\s?)(\d{1,2})\s*(?:[h:]\s*(\d{2})?)\s*$/.exec(t);
  let h = fin ? 23 : 0;
  let mi = fin ? 59 : 0;
  let reste = t;
  if (heure && /[h:]/.test(t.slice(heure.index))) {
    h = +heure[1]; mi = +(heure[2] ?? 0);
    reste = t.slice(0, heure.index).replace(/\s?à$/, '').trim();
  }
  if (h > 23 || mi > 59) return null;
  let an; let mois; let jour;
  const auj = partiesParis(maintenant);
  if (reste === "aujourd'hui" || reste === 'aujourdhui' || reste === '') {
    if (reste === '' && !heure) return null;
    ({ an, mois, jour } = auj);
  } else if (reste === 'demain') {
    ({ an, mois, jour } = partiesParis(maintenant + JOUR));
  } else {
    const m = /^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?$/.exec(reste);
    if (!m) return null;
    jour = +m[1]; mois = +m[2];
    an = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : auj.an;
    if (!m[3] && heureParisVersUtc(an, mois, jour, h, mi) < maintenant - 3 * JOUR) an += 1; // « 05/01 » en décembre = l'an prochain
  }
  if (mois < 1 || mois > 12 || jour < 1 || jour > 31) return null;
  const ms = heureParisVersUtc(an, mois, jour, h, mi);
  if (partiesParis(ms).jour !== jour) return null; // 31/02 et compagnie
  return ms;
}

const unix = (ms) => Math.floor(ms / 1000);
export const quand = (ms) => `<t:${unix(ms)}:f>`;
export function duree(debut, fin) {
  const jours = (fin - debut) / JOUR;
  if (jours < 1) return `${Math.max(1, Math.round((fin - debut) / 3_600_000))} h`;
  const j = Math.round(jours * 2) / 2;
  return `${String(j).replace('.', ',')} jour${j >= 2 ? 's' : ''}`;
}

// --- Règles ---
const ACTIVES = ['attente', 'acceptee'];
const chevauche = (a, debut, fin) => a.debut < fin && debut < a.fin;

// Renvoie un message d'erreur, ou null si la demande est valable.
export function verifierDemande(liste, userId, debut, fin, { maintenant = Date.now(), ignorer = null, parResponsable = false } = {}) {
  if (debut == null) return '📅 Date de début illisible. Écris par exemple `19/12/2026 10:00`.';
  if (fin == null) return '📅 Date de fin illisible. Écris par exemple `27/12/2026 18:00`.';
  if (fin <= debut) return '📅 La fin doit être après le début.';
  if (fin <= maintenant) return '📅 Cette absence est déjà terminée.';
  if (fin - debut > REGLES.dureeMax * JOUR + 60_000) return `⏱️ Une absence dure **${REGLES.dureeMax} jours** maximum. Pour plus long, demande une prolongation ensuite.`;
  if (debut > maintenant + REGLES.avanceMax * JOUR) return `🗓️ Tu peux prévenir au plus **${REGLES.avanceMax} jours** à l'avance.`;
  if (!parResponsable && debut < maintenant - REGLES.retardMax * JOUR) return `⌛ Tu peux prévenir après coup, mais au plus **${REGLES.retardMax} jours** après le début.`;
  const miennes = liste.filter((a) => a.userId === userId && a.id !== ignorer && ACTIVES.includes(a.statut));
  if (!parResponsable && miennes.some((a) => a.statut === 'attente')) return '⏳ Tu as déjà une demande en attente : attends la réponse (ou annule-la dans « Mes absences »).';
  if (miennes.some((a) => chevauche(a, debut, fin))) return '🔁 Tu as déjà une absence sur cette période.';
  return null;
}

// Autres membres absents (acceptés ou en attente) sur une période.
export const absentsSur = (liste, debut, fin, sauf = null) => liste.filter((a) => a.userId !== sauf && ACTIVES.includes(a.statut) && chevauche(a, debut, fin));

// --- Staff ---
const nomPropre = (n) => n.replace(/[^\p{L}\p{N} ]/gu, '').trim().toLowerCase();
const NOMS_STAFF = GRADES.map((g) => g.nom.toLowerCase());
export const estRoleStaff = (nom) => NOMS_STAFF.includes(nomPropre(nom));
const estStaff = (membre) => membre.permissions.has(PermissionFlagsBits.ManageMessages)
  || membre.roles.cache.some((r) => estRoleStaff(r.name));
const peutDecider = (membre) => membre.permissions.has(PermissionFlagsBits.ManageRoles)
  || membre.roles.cache.some((r) => STAFF_DECIDEUR.map((n) => n.toLowerCase()).includes(nomPropre(r.name)));

async function membresStaff(guild) {
  await guild.members.fetch();
  return [...guild.members.cache.values()].filter((m) => !m.user.bot && m.roles.cache.some((r) => estRoleStaff(r.name)));
}

// --- Rôle « En absence » : affiché à part et placé le plus haut possible ---
async function roleAbsence(guild, d = lireData()) {
  const roles = await guild.roles.fetch();
  let role = (d.reglages.roleId && roles.get(d.reglages.roleId)) || roles.find((r) => r.name === NOM_ROLE);
  if (!role) {
    role = await guild.roles.create({ name: NOM_ROLE, color: COULEUR, hoist: true, mentionable: false, permissions: [], reason: 'Absences du staff' });
    const haut = guild.members.me.roles.highest.position;
    await role.setPosition(Math.max(1, haut - 1)).catch(() => {});
  }
  if (d.reglages.roleId !== role.id) { d.reglages.roleId = role.id; ecrireData(d); }
  return role;
}

// --- Messages ---
const boutonsPanneau = () => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId('abs-declarer').setLabel('Déclarer une absence').setEmoji('📝').setStyle(ButtonStyle.Primary),
  new ButtonBuilder().setCustomId('abs-miennes').setLabel('Mes absences').setEmoji('📋').setStyle(ButtonStyle.Secondary),
);
const embedPanneau = (dispo) => new EmbedBuilder()
  .setColor(COULEUR)
  .setTitle('🌴 Absences du staff')
  .setDescription([
    'Tu pars quelques jours ? Préviens l\'équipe ici 👇',
    `*Jusqu'à ${REGLES.dureeMax} jours, jusqu'à ${REGLES.avanceMax} jours à l'avance · dates en heure de Bruxelles/Paris.*`,
    '',
    `• Tu peux déclarer jusqu'à **${REGLES.dureeMax} jours** d'absence, jusqu'à **${REGLES.avanceMax} jours** à l'avance.`,
    `• Tu peux prévenir après coup, jusqu'à **${REGLES.retardMax} jours** après le début.`,
    '• **Une seule demande** en attente à la fois, et pas deux absences qui se chevauchent.',
    `• Une fois absent, tu peux demander jusqu'à **${REGLES.prolongationsMax} prolongations**, validées de la même façon.`,
    '',
    `Pendant ton absence, tu as le rôle **${NOM_ROLE}** : tout le monde voit que tu n'es pas là. Il part tout seul à ton retour.`,
  ].join('\n'))
  .setFooter({ text: dispo ?? 'Les Naufragés · absences du staff' });

const STATUTS = {
  attente: '⏳ En attente', acceptee: '✅ Acceptée', refusee: '❌ Refusée', annulee: '🚫 Annulée', terminee: '🏁 Terminée',
};
function embedDemande(a, autres, titre = 'Demande d\'absence') {
  const e = new EmbedBuilder()
    .setColor(a.statut === 'acceptee' ? 0x2ecc71 : a.statut === 'attente' ? COULEUR : GRIS)
    .setTitle(`🌴 ${titre} · ${STATUTS[a.statut]}`)
    .addFields(
      { name: 'Membre', value: `<@${a.userId}>`, inline: true },
      { name: 'Période', value: `${quand(a.debut)} →\n${quand(a.fin)}`, inline: true },
      { name: 'Durée', value: duree(a.debut, a.fin), inline: true },
      { name: 'Motif', value: a.motif.slice(0, 1000), inline: true },
      { name: 'Soumise', value: `<t:${unix(a.soumise)}:R>${a.parQui ? ` par <@${a.parQui}>` : ''}`, inline: true },
    );
  if (a.infos) e.addFields({ name: 'Infos', value: a.infos.slice(0, 1000) });
  if (autres?.length) {
    e.addFields({ name: `⚠️ ${autres.length} autre${autres.length > 1 ? 's' : ''} membre${autres.length > 1 ? 's' : ''} absent${autres.length > 1 ? 's' : ''} sur cette période`, value: autres.map((x) => `<@${x.userId}> (${quand(x.debut)} → ${quand(x.fin)})`).join('\n').slice(0, 1000) });
  }
  e.setFooter({ text: 'Heure de Bruxelles/Paris · aucune autre absence de ce membre sur cette période' });
  return e;
}
const boutonsDecision = (id, prolongation = false) => new ActionRowBuilder().addComponents(
  new ButtonBuilder().setCustomId(`abs-oui:${id}:${prolongation ? 'p' : ''}`).setLabel('Accepter').setStyle(ButtonStyle.Success),
  new ButtonBuilder().setCustomId(`abs-non:${id}:${prolongation ? 'p' : ''}`).setLabel('Refuser').setStyle(ButtonStyle.Danger),
);

// --- Formulaires ---
const champ = (id, label, style, requis, placeholder, max = 100) => new ActionRowBuilder().addComponents(
  new TextInputBuilder().setCustomId(id).setLabel(label).setStyle(style).setRequired(requis).setPlaceholder(placeholder).setMaxLength(max),
);
const formulaireAbsence = () => new ModalBuilder().setCustomId('abs-form').setTitle('Déclarer une absence').addComponents(
  champ('debut', 'Début (heure de Bruxelles)', TextInputStyle.Short, true, '19/12/2026 10:00  ou  maintenant', 40),
  champ('fin', 'Fin prévue', TextInputStyle.Short, true, '27/12/2026 18:00', 40),
  champ('motif', 'Motif', TextInputStyle.Short, true, 'vacances, examens, raison personnelle, déplacement, maladie, autre', 100),
  champ('infos', 'Informations complémentaires (facultatif)', TextInputStyle.Paragraph, false, 'Joignable sur Discord le soir, pas de PC…', 500),
);
const formulaireProlongation = (a) => new ModalBuilder().setCustomId(`abs-plg-form:${a.id}`).setTitle('Prolonger mon absence').addComponents(
  champ('fin', 'Nouvelle date de fin', TextInputStyle.Short, true, '30/12/2026 18:00', 40),
  champ('motif', 'Pourquoi ? (facultatif)', TextInputStyle.Short, false, 'retour décalé, toujours malade…', 100),
);
const formulaireRefus = (id, p) => new ModalBuilder().setCustomId(`abs-non-form:${id}:${p}`).setTitle('Refuser la demande').addComponents(
  champ('raison', 'Raison (envoyée au membre, facultatif)', TextInputStyle.Paragraph, false, 'Trop de monde absent ce week-end-là…', 300),
);

const reponse = (i, content) => i.reply({ content, flags: MessageFlags.Ephemeral });

// --- /absences-setup : poste le panneau et règle le salon des responsables ---
async function setup(i) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const d = lireData();
  const salonValidation = i.options.getChannel('salon_responsables');
  d.reglages.salonValidation = salonValidation.id;
  const role = await roleAbsence(i.guild, d);
  const msg = await i.channel.send({ embeds: [embedPanneau(await texteDispo(i.guild))], components: [boutonsPanneau()] });
  d.reglages.panneau = { salonId: i.channel.id, messageId: msg.id };
  ecrireData(d);
  return i.editReply([
    '✅ Panneau des absences posté.',
    `📨 Les demandes arriveront dans ${salonValidation} (Accepter / Refuser : Fondateur, Admin, Responsable).`,
    `🌴 Rôle ${role} prêt : il s'affiche à part dans la liste des membres.`,
    'Si les absents n\'apparaissent pas dans « En absence » : Paramètres du serveur > Rôles, glisse ce rôle **au-dessus** des rôles du staff (mais sous celui du bot).',
  ].join('\n'));
}

async function texteDispo(guild, d = lireData(), maintenant = Date.now()) {
  const staff = await membresStaff(guild).catch(() => []);
  if (!staff.length) return null;
  const absents = new Set(absentsSur(d.liste.filter((a) => a.statut === 'acceptee'), maintenant, maintenant + 1).map((a) => a.userId));
  const dispo = staff.filter((m) => !absents.has(m.id)).length;
  return `${dispo} / ${staff.length} membres du staff disponibles aujourd'hui`;
}
async function majPanneau(client, d = lireData()) {
  const p = d.reglages.panneau;
  if (!p) return;
  const salon = await client.channels.fetch(p.salonId).catch(() => null);
  const msg = await salon?.messages.fetch(p.messageId).catch(() => null);
  if (msg) await msg.edit({ embeds: [embedPanneau(await texteDispo(salon.guild, d))], components: [boutonsPanneau()] }).catch(() => {});
}

// --- Bouton « Déclarer une absence » ---
async function ouvrirDeclaration(i) {
  if (!estStaff(i.member)) return reponse(i, '🚫 Ce bouton est réservé au staff.');
  const d = lireData();
  if (!d.reglages.salonValidation) return reponse(i, 'Les absences ne sont pas encore réglées : un admin doit taper `/absences-setup`.');
  if (d.liste.some((a) => a.userId === i.user.id && a.statut === 'attente')) return reponse(i, '⏳ Tu as déjà une demande en attente. Regarde « Mes absences ».');
  return i.showModal(formulaireAbsence());
}

async function envoyerAuxResponsables(client, d, a, { prolongation = false } = {}) {
  const salon = await client.channels.fetch(d.reglages.salonValidation).catch(() => null);
  if (!salon) return false;
  const debut = a.debut;
  const fin = prolongation ? a.prolongation.fin : a.fin;
  const autres = absentsSur(d.liste, debut, fin, a.userId);
  const staff = await membresStaff(salon.guild).catch(() => []);
  const vue = prolongation ? { ...a, fin, statut: 'attente', motif: `${a.motif}${a.prolongation.motif ? ` · prolongation : ${a.prolongation.motif}` : ''}` } : a;
  const embed = embedDemande(vue, autres, prolongation ? `Prolongation n°${(a.prolongations ?? 0) + 1} (fin prévue avant : ${new Date(a.fin).toLocaleDateString('fr-BE', { timeZone: 'Europe/Paris' })})` : 'Demande d\'absence');
  if (staff.length) {
    const dispo = staff.length - 1 - new Set(autres.map((x) => x.userId)).size;
    if (dispo <= Math.max(2, Math.floor(staff.length * 0.3))) embed.setColor(ORANGE).setDescription(`⚠️ **Faible disponibilité** : il ne resterait que **${Math.max(0, dispo)}** membre${dispo > 1 ? 's' : ''} du staff sur cette période.`);
  }
  const msg = await salon.send({ embeds: [embed], components: [boutonsDecision(a.id, prolongation)], allowedMentions: { parse: [] } });
  if (prolongation) a.prolongation.messageId = msg.id; else a.messageId = msg.id;
  a.salonId = salon.id;
  return true;
}

async function recevoirDeclaration(i) {
  const d = lireData();
  const v = (id) => i.fields.getTextInputValue(id).trim();
  const debut = lireDate(v('debut'));
  const fin = lireDate(v('fin'), { fin: true });
  const erreur = verifierDemande(d.liste, i.user.id, debut, fin);
  if (erreur) return reponse(i, `${erreur}\n\nTu as écrit : début « ${v('debut')} », fin « ${v('fin')} ». Reclique sur **Déclarer une absence** pour corriger.`);
  const a = { id: d.prochainId++, userId: i.user.id, nom: i.member.displayName, debut, fin, motif: v('motif') || 'autre', infos: v('infos') || '', statut: 'attente', soumise: Date.now(), prolongations: 0 };
  d.liste.push(a);
  if (!await envoyerAuxResponsables(i.client, d, a)) return reponse(i, '😵 Salon des responsables introuvable : préviens un admin (`/absences-setup`).');
  ecrireData(d);
  return reponse(i, `📨 Demande envoyée aux responsables : ${quand(debut)} → ${quand(fin)} (${duree(debut, fin)}). Tu recevras la réponse en message privé.`);
}

// --- Bouton « Mes absences » ---
async function mesAbsences(i) {
  const d = lireData();
  const miennes = d.liste.filter((a) => a.userId === i.user.id).sort((x, y) => y.debut - x.debut).slice(0, 8);
  if (!miennes.length) return reponse(i, 'Tu n\'as aucune absence enregistrée. 🏝️');
  const lignes = miennes.map((a) => `**#${a.id}** ${STATUTS[a.statut]} · ${quand(a.debut)} → ${quand(a.fin)} · ${a.motif}${a.prolongation ? ' · ⏳ prolongation demandée' : ''}${a.prolongations ? ` · ${a.prolongations} prolongation(s)` : ''}`);
  const maintenant = Date.now();
  const boutons = [];
  for (const a of miennes) {
    if (a.statut === 'attente' || (a.statut === 'acceptee' && a.debut > maintenant)) {
      boutons.push(new ButtonBuilder().setCustomId(`abs-annuler:${a.id}`).setLabel(`Annuler #${a.id}`).setEmoji('🚫').setStyle(ButtonStyle.Secondary));
    }
    if (a.statut === 'acceptee' && a.fin > maintenant && !a.prolongation && (a.prolongations ?? 0) < REGLES.prolongationsMax) {
      boutons.push(new ButtonBuilder().setCustomId(`abs-prolonger:${a.id}`).setLabel(`Prolonger #${a.id}`).setEmoji('⏩').setStyle(ButtonStyle.Primary));
    }
    if (a.statut === 'acceptee' && a.debut <= maintenant && a.fin > maintenant) {
      boutons.push(new ButtonBuilder().setCustomId(`abs-retour:${a.id}`).setLabel('Je suis de retour').setEmoji('👋').setStyle(ButtonStyle.Success));
    }
  }
  return i.reply({
    flags: MessageFlags.Ephemeral,
    embeds: [new EmbedBuilder().setColor(COULEUR).setTitle('📋 Mes absences').setDescription(lignes.join('\n'))],
    components: boutons.length ? [new ActionRowBuilder().addComponents(boutons.slice(0, 5))] : [],
  });
}

async function annuler(i, id) {
  const d = lireData();
  const a = d.liste.find((x) => x.id === id && x.userId === i.user.id);
  if (!a || !(a.statut === 'attente' || (a.statut === 'acceptee' && a.debut > Date.now()))) return reponse(i, 'Cette absence ne peut plus être annulée.');
  a.statut = 'annulee';
  ecrireData(d);
  await majMessageDemande(i.client, a, `🚫 Annulée par le membre`);
  return i.update({ content: `🚫 Absence #${a.id} annulée.`, embeds: [], components: [] });
}

async function retourAnticipe(i, id) {
  const d = lireData();
  const a = d.liste.find((x) => x.id === id && x.userId === i.user.id && x.statut === 'acceptee');
  if (!a) return reponse(i, 'Absence introuvable.');
  a.fin = Date.now();
  delete a.prolongation;
  ecrireData(d);
  await verifierAbsences(i.client);
  return i.update({ content: '👋 Bon retour parmi nous ! Ton rôle d\'absence a été retiré.', embeds: [], components: [] });
}

async function ouvrirProlongation(i, id) {
  const a = lireData().liste.find((x) => x.id === id && x.userId === i.user.id);
  if (!a || a.statut !== 'acceptee' || a.fin <= Date.now()) return reponse(i, 'Seule une absence acceptée et pas encore finie peut être prolongée.');
  if (a.prolongation) return reponse(i, '⏳ Une prolongation est déjà en attente.');
  if ((a.prolongations ?? 0) >= REGLES.prolongationsMax) return reponse(i, `Tu as déjà utilisé tes ${REGLES.prolongationsMax} prolongations pour cette absence.`);
  return i.showModal(formulaireProlongation(a));
}

async function recevoirProlongation(i, id) {
  const d = lireData();
  const a = d.liste.find((x) => x.id === id && x.userId === i.user.id);
  if (!a || a.statut !== 'acceptee' || a.prolongation) return reponse(i, 'Cette absence ne peut pas être prolongée.');
  const fin = lireDate(i.fields.getTextInputValue('fin'), { fin: true });
  if (fin == null || fin <= a.fin) return reponse(i, '📅 La nouvelle fin doit être une date lisible, après la fin actuelle.');
  if (fin - a.fin > REGLES.dureeMax * JOUR + 60_000) return reponse(i, `⏱️ Une prolongation ajoute **${REGLES.dureeMax} jours** maximum.`);
  if (d.liste.some((x) => x.userId === a.userId && x.id !== a.id && ACTIVES.includes(x.statut) && chevauche(x, a.fin, fin))) return reponse(i, '🔁 Tu as déjà une autre absence sur cette période.');
  a.prolongation = { fin, motif: i.fields.getTextInputValue('motif').trim(), soumise: Date.now() };
  if (!await envoyerAuxResponsables(i.client, d, a, { prolongation: true })) return reponse(i, '😵 Salon des responsables introuvable.');
  ecrireData(d);
  return reponse(i, `📨 Prolongation demandée jusqu'au ${quand(fin)}. Réponse en message privé.`);
}

// --- Décision des responsables ---
async function majMessageDemande(client, a, note, messageId = a.messageId) {
  if (!a.salonId || !messageId) return;
  const salon = await client.channels.fetch(a.salonId).catch(() => null);
  const msg = await salon?.messages.fetch(messageId).catch(() => null);
  if (!msg?.embeds[0]) return;
  const e = EmbedBuilder.from(msg.embeds[0]).setColor(GRIS).setFooter({ text: note });
  await msg.edit({ embeds: [e], components: [] }).catch(() => {});
}

async function decider(i, accepte, id, prolongation, raison = '') {
  const d = lireData();
  const a = d.liste.find((x) => x.id === id);
  if (!a || (prolongation ? !a.prolongation : a.statut !== 'attente')) {
    return i.isModalSubmit() ? reponse(i, 'Cette demande a déjà été traitée.') : i.update({ components: [] });
  }
  const membre = await i.guild.members.fetch(a.userId).catch(() => null);
  let mp;
  if (prolongation) {
    const ancienne = a.fin;
    if (accepte) { a.fin = a.prolongation.fin; a.prolongations = (a.prolongations ?? 0) + 1; }
    mp = accepte
      ? `✅ Ta prolongation d'absence est **acceptée** : retour prévu le ${quand(a.fin)} (au lieu du ${quand(ancienne)}).`
      : `❌ Ta prolongation d'absence a été **refusée**${raison ? ` : ${raison}` : '.'} Retour prévu le ${quand(a.fin)}.`;
    delete a.prolongation;
  } else {
    a.statut = accepte ? 'acceptee' : 'refusee';
    a.decidePar = i.user.id;
    if (raison) a.raisonRefus = raison;
    mp = accepte
      ? `✅ Ton absence du ${quand(a.debut)} au ${quand(a.fin)} est **acceptée** par ${i.member.displayName}. Bonnes vacances ! 🌴 Le rôle « En absence » sera mis et retiré tout seul.`
      : `❌ Ta demande d'absence du ${quand(a.debut)} au ${quand(a.fin)} a été **refusée** par ${i.member.displayName}${raison ? ` : ${raison}` : '.'}`;
  }
  ecrireData(d);
  const embed = EmbedBuilder.from(i.message.embeds[0])
    .setColor(accepte ? 0x2ecc71 : ROUGE)
    .setTitle(i.message.embeds[0].title.replace(/· .*$/, `· ${accepte ? '✅ Acceptée' : '❌ Refusée'}`))
    .setFooter({ text: `${accepte ? '✅ Acceptée' : '❌ Refusée'} par ${i.member.displayName}${raison ? ` · ${raison}` : ''}` });
  await i.update({ embeds: [embed], components: [] });
  if (membre) await membre.send(mp).catch(() => i.followUp({ content: `(MP impossible pour <@${a.userId}>.)`, flags: MessageFlags.Ephemeral }).catch(() => {}));
  await verifierAbsences(i.client);
  return true;
}

// --- /absences : planning, déclarer pour un membre ---
async function commandeAbsences(i) {
  const sous = i.options.getSubcommand();
  const d = lireData();
  if (sous === 'planning') {
    const maintenant = Date.now();
    const jours = i.options.getInteger('jours') ?? 14;
    const fin = maintenant + jours * JOUR;
    const visibles = d.liste.filter((a) => ACTIVES.includes(a.statut) && chevauche(a, maintenant, fin)).sort((x, y) => x.debut - y.debut);
    const staff = await membresStaff(i.guild).catch(() => []);
    const lignes = visibles.map((a) => `${a.statut === 'attente' ? '⏳' : a.debut <= maintenant ? '🌴' : '🗓️'} <@${a.userId}> · ${quand(a.debut)} → ${quand(a.fin)} · ${a.motif}`);
    // Jours de faible disponibilité (moins de 30 % du staff, ou 2 personnes ou moins).
    const faibles = [];
    if (staff.length) {
      for (let k = 0; k < jours; k++) {
        const t = maintenant + k * JOUR;
        const absents = new Set(d.liste.filter((a) => a.statut === 'acceptee' && chevauche(a, t, t + 1)).map((a) => a.userId)).size;
        const dispo = staff.length - absents;
        if (absents && dispo <= Math.max(2, Math.floor(staff.length * 0.3))) faibles.push(`<t:${unix(t)}:D> : ${dispo} dispo`);
      }
    }
    const embed = new EmbedBuilder().setColor(COULEUR).setTitle(`📅 Planning des absences (${jours} prochains jours)`)
      .setDescription(lignes.join('\n') || 'Personne n\'est absent sur cette période. 💪')
      .setFooter({ text: (await texteDispo(i.guild, d)) ?? 'Absences du staff' });
    if (faibles.length) embed.addFields({ name: '⚠️ Faible disponibilité', value: faibles.slice(0, 10).join('\n') });
    return i.reply({ embeds: [embed], flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  }
  if (sous === 'declarer-pour') {
    if (!peutDecider(i.member)) return reponse(i, '🚫 Réservé aux responsables du staff.');
    const cible = i.options.getMember('membre');
    if (!cible) return reponse(i, 'Membre introuvable.');
    const debut = lireDate(i.options.getString('debut'));
    const fin = lireDate(i.options.getString('fin'), { fin: true });
    const erreur = verifierDemande(d.liste, cible.id, debut, fin, { parResponsable: true });
    if (erreur) return reponse(i, erreur);
    const a = { id: d.prochainId++, userId: cible.id, nom: cible.displayName, debut, fin, motif: i.options.getString('motif') ?? 'autre', infos: '', statut: 'acceptee', soumise: Date.now(), parQui: i.user.id, decidePar: i.user.id, prolongations: 0 };
    d.liste.push(a);
    ecrireData(d);
    await verifierAbsences(i.client);
    return reponse(i, `✅ Absence enregistrée et acceptée pour ${cible} : ${quand(debut)} → ${quand(fin)}.`);
  }
  return null;
}

// --- Chaque minute : mettre / retirer le rôle, prévenir au retour ---
// Salon « absences staff » du serveur : panneau + demandes, posté tout seul au premier démarrage
// (on peut en choisir un autre avec /absences-setup).
export const SALON_ABSENCES = process.env.SALON_ABSENCES_ID || '828255217757716501';
async function installerParDefaut(client, d) {
  const salon = await client.channels.fetch(SALON_ABSENCES).catch(() => null);
  if (!salon?.isTextBased()) return;
  d.reglages.salonValidation = salon.id;
  await roleAbsence(salon.guild, d);
  const msg = await salon.send({ embeds: [embedPanneau(await texteDispo(salon.guild, d))], components: [boutonsPanneau()] });
  d.reglages.panneau = { salonId: salon.id, messageId: msg.id };
  ecrireData(d);
  console.log('Absences : panneau posté dans', salon.name);
}

export async function verifierAbsences(client, guildId = process.env.GUILD_ID) {
  const d = lireData();
  if (!d.reglages.salonValidation && !d.reglages.installationTentee) {
    d.reglages.installationTentee = true;
    ecrireData(d);
    await installerParDefaut(client, d).catch((e) => console.error('Absences installation :', e.message));
  }
  if (!d.reglages.salonValidation || !guildId) return;
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;
  const role = await roleAbsence(guild, d).catch(() => null);
  if (!role) return;
  const maintenant = Date.now();
  let change = false;
  // Demandes jamais traitées dont la fin est passée : classées automatiquement.
  for (const a of d.liste) {
    if (a.statut === 'attente' && a.fin <= maintenant) {
      a.statut = 'annulee'; change = true;
      await majMessageDemande(client, a, '⌛ Expirée : personne n\'a répondu avant la fin');
    }
    if (a.statut === 'acceptee' && a.fin <= maintenant) {
      a.statut = 'terminee'; change = true;
      if (a.prolongation) { await majMessageDemande(client, a, '⌛ Expirée', a.prolongation.messageId); delete a.prolongation; }
      const m = await guild.members.fetch(a.userId).catch(() => null);
      if (m && !a.retourAnnonce) {
        a.retourAnnonce = true;
        await m.send('👋 Ton absence est terminée : bon retour chez Les Naufragés ! Ton rôle « En absence » a été retiré.').catch(() => {});
      }
    }
  }
  // Qui doit avoir le rôle maintenant ?
  const absents = new Set(d.liste.filter((a) => a.statut === 'acceptee' && a.debut <= maintenant && a.fin > maintenant).map((a) => a.userId));
  for (const id of absents) {
    const m = await guild.members.fetch(id).catch(() => null);
    if (m && !m.roles.cache.has(role.id)) { await m.roles.add(role, 'Absence du staff').catch((e) => console.error('Absences :', e.message)); change = true; }
  }
  for (const m of role.members.values()) {
    if (!absents.has(m.id)) { await m.roles.remove(role, 'Fin d\'absence').catch((e) => console.error('Absences :', e.message)); change = true; }
  }
  // On garde 6 mois d'historique.
  const avant = d.liste.length;
  d.liste = d.liste.filter((a) => ACTIVES.includes(a.statut) || a.fin > maintenant - 180 * JOUR);
  if (change || avant !== d.liste.length) { ecrireData(d); await majPanneau(client, d); }
}

export const actionsAbsences = {
  'absences-setup': setup,
  absences: commandeAbsences,
};

// Boutons et formulaires. Renvoie true si l'interaction a été traitée.
export async function interactionAbsences(i) {
  const id = i.customId ?? '';
  if (!id.startsWith('abs-')) return false;
  const [type, a, b] = id.split(':');
  const n = Number(a);
  if (i.isButton()) {
    if (type === 'abs-declarer') await ouvrirDeclaration(i);
    else if (type === 'abs-miennes') await mesAbsences(i);
    else if (type === 'abs-annuler') await annuler(i, n);
    else if (type === 'abs-retour') await retourAnticipe(i, n);
    else if (type === 'abs-prolonger') await ouvrirProlongation(i, n);
    else if (type === 'abs-oui' || type === 'abs-non') {
      if (!peutDecider(i.member)) await reponse(i, '🚫 Seuls les responsables du staff (Fondateur, Admin, Responsable) peuvent décider.');
      else if (type === 'abs-oui') await decider(i, true, n, b === 'p');
      else await i.showModal(formulaireRefus(n, b));
    } else return false;
    return true;
  }
  if (i.isModalSubmit()) {
    if (type === 'abs-form') await recevoirDeclaration(i);
    else if (type === 'abs-plg-form') await recevoirProlongation(i, n);
    else if (type === 'abs-non-form') {
      if (!peutDecider(i.member)) await reponse(i, '🚫 Réservé aux responsables.');
      else await decider(i, false, n, b === 'p', i.fields.getTextInputValue('raison').trim());
    } else return false;
    return true;
  }
  return false;
}
