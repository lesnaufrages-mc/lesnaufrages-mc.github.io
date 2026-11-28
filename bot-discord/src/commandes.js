import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { POSTES } from './staff.js';
import { TYPES } from './rapport.js';
import { definitionTraduction } from './traduction.js';
import { definitionAvertissements } from './antipub.js';

// Les commandes "/" que les membres voient en tapant "/" dans Discord.
export const commandes = [
  new SlashCommandBuilder().setName('aide').setDescription('Liste des commandes du bot'),
  new SlashCommandBuilder().setName('jouer').setDescription('Lien pour jouer au Mot Mystère'),
  new SlashCommandBuilder().setName('motdujour').setDescription('Numéro du mot du jour et lien du jeu'),
  new SlashCommandBuilder().setName('classement').setDescription('Top 10 des joueurs du Mot Mystère'),
  new SlashCommandBuilder().setName('serveur').setDescription('État du serveur Minecraft : en ligne, joueurs, adresse'),
  new SlashCommandBuilder().setName('invitation').setDescription("Lien d'invitation du serveur"),
  new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Poste le bouton pour prendre le rôle 🔔 Mot du jour')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('clear')
    .setDescription('Supprime des messages récents du salon')
    .addIntegerOption((o) => o.setName('nombre').setDescription('Combien (1 à 100)').setMinValue(1).setMaxValue(100).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
  new SlashCommandBuilder()
    .setName('mute')
    .setDescription("Empêche un membre d'écrire pendant un moment")
    .addUserOption((o) => o.setName('membre').setDescription('Qui ?').setRequired(true))
    .addIntegerOption((o) => o.setName('minutes').setDescription('Durée en minutes').setMinValue(1).setMaxValue(40320).setRequired(true))
    .addStringOption((o) => o.setName('raison').setDescription('Pourquoi ?'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  new SlashCommandBuilder().setName('staff').setDescription('Liste des membres du staff'),
  new SlashCommandBuilder()
    .setName('actus')
    .setDescription('Poste tout de suite la dernière actu du site dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('candidature')
    .setDescription('Postuler pour rejoindre le staff')
    .addStringOption((o) => o.setName('poste').setDescription('Quel poste ?').setRequired(true)
      .addChoices(...POSTES.map((g) => ({ name: `${g.emoji} ${g.nom}`, value: g.nom })))),
  new SlashCommandBuilder()
    .setName('staff-setup')
    .setDescription('Crée les rôles du staff qui manquent (Fondateur, Admin, Modo...)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('recrutement')
    .setDescription('Poste le message de recrutement avec les boutons Postuler dans ce salon')
    .addChannelOption((o) => o.setName('salon_candidatures').setDescription('Salon privé où le staff reçoit les candidatures')
      .addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder().setName('niveau').setDescription('Ton niveau d\'activité (ou celui d\'un membre)')
    .addUserOption((o) => o.setName('membre').setDescription('Quel membre ?')),
  new SlashCommandBuilder().setName('top-niveaux').setDescription('Les 10 membres les plus actifs'),
  new SlashCommandBuilder()
    .setName('roles-setup')
    .setDescription('Crée les rôles de la communauté (Membre, niveaux, notifications, profil...)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('reglement')
    .setDescription('Poste le règlement avec le bouton « J\'accepte » dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('roles-panneau')
    .setDescription('Poste les menus pour choisir ses rôles dans ce salon')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('Noter les changements du serveur Minecraft pour le rapport du lundi')
    .addSubcommand((s) => s.setName('ajouter').setDescription('Ajouter un point au prochain rapport')
      .addStringOption((o) => o.setName('type').setDescription('Quel genre de changement ?').setRequired(true)
        .addChoices(...Object.entries(TYPES).map(([v, t]) => ({ name: `${t.emoji} ${t.titre}`, value: v }))))
      .addStringOption((o) => o.setName('titre').setDescription('Titre court').setRequired(true).setMaxLength(100))
      .addStringOption((o) => o.setName('explication').setDescription('Ce qui change concrètement pour les joueurs').setRequired(true).setMaxLength(1000))
      .addBooleanOption((o) => o.setName('annoncer').setDescription('Annoncer aussi tout de suite dans le salon du serveur Minecraft (oui par défaut)')))
    .addSubcommand((s) => s.setName('voir').setDescription('Voir les points du prochain rapport'))
    .addSubcommand((s) => s.setName('retirer').setDescription('Retirer un point')
      .addIntegerOption((o) => o.setName('numero').setDescription('Numéro (voir /changelog voir)').setRequired(true).setMinValue(1)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('rapport')
    .setDescription('Rapport hebdomadaire : aperçu privé, ou publication tout de suite')
    .addBooleanOption((o) => o.setName('publier').setDescription('Oui = le poster maintenant dans le salon du rapport'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('maintenance')
    .setDescription('Annoncer une maintenance du serveur Minecraft')
    .addSubcommand((s) => s.setName('programmer').setDescription('Annoncer une maintenance à venir')
      .addStringOption((o) => o.setName('raison').setDescription('Objet (ex. mise à jour des plugins)').setRequired(true).setMaxLength(200))
      .addStringOption((o) => o.setName('heure').setDescription('Heure de début, ex. 21:30 (sinon : dans X minutes)'))
      .addIntegerOption((o) => o.setName('dans').setDescription('Début dans combien de minutes (30 par défaut)').setMinValue(0).setMaxValue(10080))
      .addIntegerOption((o) => o.setName('duree').setDescription('Durée estimée en minutes (30 par défaut)').setMinValue(5).setMaxValue(1440))
      .addBooleanOption((o) => o.setName('mentionner').setDescription('Mentionner le rôle Notif Mises à jour (oui par défaut)')))
    .addSubcommand((s) => s.setName('terminer').setDescription('Annoncer la fin de la maintenance'))
    .addSubcommand((s) => s.setName('annuler').setDescription('Annuler la maintenance annoncée'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('roles-minecraft')
    .setDescription('Crée les rôles des grades du serveur Minecraft qui manquent (VIP+, Builder, MC・Légende...)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder()
    .setName('absences-setup')
    .setDescription('Poste le panneau « Absences du staff » dans ce salon')
    .addChannelOption((o) => o.setName('salon_responsables').setDescription('Salon privé où les responsables acceptent ou refusent les absences')
      .addChannelTypes(ChannelType.GuildText).setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  new SlashCommandBuilder()
    .setName('absences')
    .setDescription('Absences du staff')
    .addSubcommand((s) => s.setName('planning').setDescription('Qui est absent (ou le sera) dans les prochains jours')
      .addIntegerOption((o) => o.setName('jours').setDescription('Combien de jours (14 par défaut)').setMinValue(1).setMaxValue(60)))
    .addSubcommand((s) => s.setName('declarer-pour').setDescription('Responsables : enregistrer l\'absence d\'un membre du staff (acceptée directement)')
      .addUserOption((o) => o.setName('membre').setDescription('Qui ?').setRequired(true))
      .addStringOption((o) => o.setName('debut').setDescription('Début, ex. 19/12/2026 10:00 ou maintenant').setRequired(true))
      .addStringOption((o) => o.setName('fin').setDescription('Fin, ex. 27/12/2026 18:00').setRequired(true))
      .addStringOption((o) => o.setName('motif').setDescription('Motif (vacances, examens...)').setMaxLength(100))),
  new SlashCommandBuilder()
    .setName('guard')
    .setDescription('Garde anti-nuke : suppressions en masse, webhooks pirates, @everyone')
    .addSubcommand((s) => s.setName('statut').setDescription('État de la garde et permissions du bot'))
    .addSubcommand((s) => s.setName('activer').setDescription('Propriétaire : activer ou mettre en pause la garde')
      .addBooleanOption((o) => o.setName('actif').setDescription('Oui = active').setRequired(true)))
    .addSubcommand((s) => s.setName('confiance').setDescription('Propriétaire : membre ou bot que la garde ne sanctionne jamais')
      .addUserOption((o) => o.setName('membre').setDescription('Qui ?').setRequired(true))
      .addStringOption((o) => o.setName('action').setDescription('Ajouter (par défaut) ou retirer')
        .addChoices({ name: 'Ajouter', value: 'ajouter' }, { name: 'Retirer', value: 'retirer' })))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  new SlashCommandBuilder().setName('vote').setDescription('Liens pour voter pour le serveur Minecraft et gagner des récompenses'),
  new SlashCommandBuilder().setName('mon-lien').setDescription('Ton lien d\'invitation perso : chaque ami invité te rapporte XP et rôles'),
  new SlashCommandBuilder().setName('invitations').setDescription('Combien de naufragés tu as invités (ou un autre membre)')
    .addUserOption((o) => o.setName('membre').setDescription('Qui ? (toi par défaut)')),
  new SlashCommandBuilder().setName('top-invitations').setDescription('Classement des meilleurs recruteurs du Discord'),
  new SlashCommandBuilder().setName('anniversaire-set').setDescription('Enregistre ta date d\'anniversaire : le bot te la souhaitera')
    .addIntegerOption((o) => o.setName('jour').setDescription('Jour (1-31)').setMinValue(1).setMaxValue(31).setRequired(true))
    .addIntegerOption((o) => o.setName('mois').setDescription('Mois (1-12)').setMinValue(1).setMaxValue(12).setRequired(true)),
  new SlashCommandBuilder().setName('anniversaire-retirer').setDescription('Efface ta date d\'anniversaire'),
  new SlashCommandBuilder().setName('anniversaire-liste').setDescription('Les prochains anniversaires du serveur'),
  new SlashCommandBuilder().setName('rappel-vote').setDescription('Être prévenu chaque jour pour voter pour le serveur Minecraft (ou plus)'),
  new SlashCommandBuilder().setName('ranger-roles').setDescription('Admin : ranger tous les rôles par catégories avec séparateurs')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  new SlashCommandBuilder().setName('tag-serveur').setDescription('Comment porter le tag du serveur et recevoir le rôle Supporter'),
  new SlashCommandBuilder().setName('tournoi').setDescription('Tournois du serveur')
    .addSubcommand((s) => s.setName('creer').setDescription('Staff : créer un tournoi (message avec inscriptions)')
      .addStringOption((o) => o.setName('nom').setDescription('Nom, ex. Coupe des Naufragés').setRequired(true).setMaxLength(80))
      .addStringOption((o) => o.setName('jeu').setDescription('Jeu, ex. Minecraft PvP').setRequired(true).setMaxLength(60))
      .addIntegerOption((o) => o.setName('places').setDescription('Nombre de places (16 par défaut)').setMinValue(2).setMaxValue(64))
      .addStringOption((o) => o.setName('format').setDescription('Format des matchs').addChoices({ name: 'BO1', value: 'BO1' }, { name: 'BO3', value: 'BO3' }, { name: 'BO5', value: 'BO5' }))
      .addRoleOption((o) => o.setName('recompense').setDescription('Rôle donné au vainqueur'))
      .addStringOption((o) => o.setName('description').setDescription('Petit texte de présentation').setMaxLength(300))
      .addStringOption((o) => o.setName('regles').setDescription('Règlement (sinon règlement par défaut)').setMaxLength(1000)))
    .addSubcommand((s) => s.setName('lancer').setDescription('Staff : fermer les inscriptions et tirer le tableau')
      .addStringOption((o) => o.setName('id').setDescription('Numéro du tournoi (le dernier par défaut)')))
    .addSubcommand((s) => s.setName('score').setDescription('Déclarer le résultat de ton match')
      .addUserOption((o) => o.setName('gagnant').setDescription('Qui a gagné ?').setRequired(true))
      .addStringOption((o) => o.setName('score').setDescription('Score, ex. 2-1').setRequired(true).setMaxLength(20))
      .addStringOption((o) => o.setName('id').setDescription('Numéro du tournoi (le dernier par défaut)')))
    .addSubcommand((s) => s.setName('voir').setDescription('Voir le tableau du tournoi')
      .addStringOption((o) => o.setName('id').setDescription('Numéro du tournoi (le dernier par défaut)')))
    .addSubcommand((s) => s.setName('annuler').setDescription('Staff : annuler un tournoi')
      .addStringOption((o) => o.setName('id').setDescription('Numéro du tournoi (le dernier par défaut)'))),
  new SlashCommandBuilder().setName('rappel-bump').setDescription('Être prévenu (ou plus) quand on peut bump le serveur sur DISBOARD'),
  definitionTraduction(SlashCommandBuilder),
  definitionAvertissements(SlashCommandBuilder),
].map((c) => c.toJSON());
