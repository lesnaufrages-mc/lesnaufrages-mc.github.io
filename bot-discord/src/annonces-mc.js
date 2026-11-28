import fs from 'node:fs';
import path from 'node:path';
import { EmbedBuilder, MessageFlags } from 'discord.js';
import { trouverRole } from './roles.js';

// Annonces officielles dans le salon du serveur Minecraft :
//  - maintenances programmées par le staff (/maintenance), avec rappel 10 min avant et message de fin ;
//  - nouveautés notées avec /changelog (et actus « Minecraft » du site), au fil de la semaine ;
//  - lien vers le rapport hebdomadaire du lundi.
// Les redémarrages / pannes détectés automatiquement sont gérés dans minecraft.js (même salon).
const env = process.env;
export const SALON_MC = env.SALON_MINECRAFT_ID || '1017711078752407622';
const ADRESSE = env.MC_ADRESSE || 'naufragesmc.mine.fun';
const ROLE_MAJ = 'Notif Mises à jour'; // rôle à la carte : ceux qui veulent être prévenus
const F_MAINT = path.resolve('data', 'maintenance.json');
export const SIGNATURE = 'Les Naufragés · Équipe du serveur Minecraft';
export const RAPPEL_AVANT_MS = 10 * 60_000;

const lireMaint = () => { try { return JSON.parse(fs.readFileSync(F_MAINT, 'utf8')); } catch { return null; } };
const ecrireMaint = (m) => {
  fs.mkdirSync(path.dirname(F_MAINT), { recursive: true });
  if (m) fs.writeFileSync(F_MAINT, JSON.stringify(m)); else try { fs.unlinkSync(F_MAINT); } catch { /* rien */ }
};
export const maintenance = () => lireMaint();
// Une maintenance « couvre » les coupures de 15 min avant son début jusqu'à 2 h après la fin prévue.
export function maintenanceActive(m, maintenant = Date.now()) {
  return Boolean(m && maintenant >= m.debut - 15 * 60_000 && maintenant <= m.fin + 2 * 3600_000);
}
export function terminerMaintenance() { const m = lireMaint(); ecrireMaint(null); return m; }

const t = (ms, f = 'F') => `<t:${Math.floor(ms / 1000)}:${f}>`;

async function salonMc(client) {
  const s = await client.channels.fetch(SALON_MC).catch(() => null);
  return s?.isTextBased() ? s : null;
}
function mention(salon) {
  const r = salon?.guild ? trouverRole(salon.guild.roles.cache, ROLE_MAJ) : null;
  return r ? { content: `<@&${r.id}>`, allowedMentions: { roles: [r.id] } } : {};
}
export async function posterMc(client, payload, { mentionner = false } = {}) {
  const salon = await salonMc(client);
  if (!salon) { console.error('Salon Minecraft introuvable : vérifie SALON_MINECRAFT_ID.'); return null; }
  return salon.send({ ...(mentionner ? mention(salon) : {}), ...payload }).catch((e) => console.error('Annonce MC :', e.message));
}

// --- Embeds ---
export function embedMaintenance(m, type = 'annonce') {
  const duree = Math.round((m.fin - m.debut) / 60_000);
  const e = new EmbedBuilder().setFooter({ text: SIGNATURE }).setTimestamp(new Date());
  if (type === 'annonce') {
    return e.setColor(0xf39c12).setTitle('🛠️ Maintenance programmée du serveur Minecraft')
      .setDescription([
        'Une opération de maintenance est prévue sur le serveur. Pendant cette période, **le serveur sera inaccessible**.',
        '',
        `📅 **Début :** ${t(m.debut)} (${t(m.debut, 'R')})`,
        `⏱️ **Durée estimée :** ${duree} min · retour prévu vers ${t(m.fin, 't')}`,
        `📝 **Objet :** ${m.raison}`,
        '',
        'Nous vous conseillons de vous mettre à l\'abri et de vous déconnecter quelques minutes avant le début. '
        + 'Vos constructions, inventaires et progressions sont sauvegardés. Merci de votre compréhension.',
      ].join('\n'));
  }
  if (type === 'rappel') {
    return e.setColor(0xf39c12).setTitle('⏳ Rappel : maintenance dans 10 minutes')
      .setDescription(`La maintenance annoncée commence ${t(m.debut, 'R')} (${m.raison}). `
        + 'Pensez à rentrer en lieu sûr et à vous déconnecter. Retour prévu vers ' + `${t(m.fin, 't')}.`);
  }
  if (type === 'debut') {
    return e.setColor(0xe67e22).setTitle('🛠️ Maintenance en cours')
      .setDescription(`Le serveur est actuellement en maintenance : ${m.raison}.\nRetour prévu vers ${t(m.fin, 't')}. `
        + 'Un message sera publié ici dès la réouverture.');
  }
  if (type === 'fin') {
    return e.setColor(0x3fae5a).setTitle('✅ Maintenance terminée : le serveur est de nouveau ouvert')
      .setDescription(`L'opération (${m.raison}) est terminée et le serveur est à nouveau accessible.\n`
        + `Adresse : \`${ADRESSE}\` (Java et Bedrock). Merci pour votre patience et bon jeu !`);
  }
  return e.setColor(0x95a5a6).setTitle('↩️ Maintenance annulée')
    .setDescription(`La maintenance prévue ${t(m.debut)} (${m.raison}) est annulée. Le serveur reste ouvert normalement.`);
}

const TITRES_NOTE = {
  nouveaute: ['✨ Nouveauté sur le serveur', 0x3fae5a],
  amelioration: ['🔧 Amélioration du serveur', 0x3498db],
  correctif: ['🛠️ Correctif appliqué', 0xe67e22],
  evenement: ['🎉 Événement sur le serveur', 0xe91e63],
  avenir: ['🔭 En préparation', 0x9b59b6],
};
export function embedNote(n) {
  const [titre, couleur] = TITRES_NOTE[n.type] ?? TITRES_NOTE.nouveaute;
  return new EmbedBuilder().setColor(couleur).setAuthor({ name: titre })
    .setTitle(String(n.titre).slice(0, 256))
    .setDescription(`${String(n.texte).slice(0, 3800)}\n\n_Ce point sera repris dans le rapport hebdomadaire du lundi._`)
    .setFooter({ text: SIGNATURE }).setTimestamp(new Date());
}

// --- Boucle (appelée chaque minute par minecraft.js) : rappel 10 min avant ---
export async function verifierMaintenance(client, maintenant = Date.now()) {
  const m = lireMaint();
  if (!m) return;
  if (!m.rappel && m.debut - maintenant <= RAPPEL_AVANT_MS && m.debut > maintenant && m.debut - m.creee > RAPPEL_AVANT_MS + 5 * 60_000) {
    m.rappel = true; ecrireMaint(m);
    await posterMc(client, { embeds: [embedMaintenance(m, 'rappel')] });
  }
  if (maintenant > m.fin + 2 * 3600_000) ecrireMaint(null); // oubliée : on nettoie
}

// --- /maintenance ---
// Heure « HH:MM » (Bruxelles) → prochain moment correspondant.
export function prochaineHeure(hhmm, maintenant = Date.now()) {
  const m = /^(\d{1,2})[:hH](\d{2})?$/.exec(hhmm.trim());
  if (!m || Number(m[1]) > 23) return null;
  const voulu = Number(m[1]) * 60 + Number(m[2] ?? 0);
  const [h, mi] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
    .format(new Date(maintenant)).split(':').map(Number);
  let ecart = voulu - (h * 60 + mi);
  if (ecart <= 0) ecart += 24 * 60;
  return Math.floor(maintenant / 60_000) * 60_000 + ecart * 60_000;
}

export async function commandeMaintenance(i) {
  const sous = i.options.getSubcommand();
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  if (sous === 'programmer') {
    const dans = i.options.getInteger('dans');
    const heure = i.options.getString('heure');
    const debut = heure ? prochaineHeure(heure) : Date.now() + (dans ?? 30) * 60_000;
    if (!debut) return i.editReply('Heure invalide : écris par exemple `21:30`.');
    const m = { debut, fin: debut + (i.options.getInteger('duree') ?? 30) * 60_000, raison: i.options.getString('raison'), creee: Date.now(), rappel: false };
    ecrireMaint(m);
    await posterMc(i.client, { embeds: [embedMaintenance(m)] }, { mentionner: i.options.getBoolean('mentionner') ?? true });
    return i.editReply(`✅ Maintenance annoncée dans <#${SALON_MC}> (${t(debut)}). Rappel automatique 10 min avant, message de fin au retour du serveur.`);
  }
  const m = terminerMaintenance();
  if (!m) return i.editReply('Aucune maintenance programmée.');
  await posterMc(i.client, { embeds: [embedMaintenance(m, sous === 'annuler' ? 'annulation' : 'fin')] });
  return i.editReply(sous === 'annuler' ? '↩️ Maintenance annulée et annoncée.' : '✅ Fin de maintenance annoncée.');
}
