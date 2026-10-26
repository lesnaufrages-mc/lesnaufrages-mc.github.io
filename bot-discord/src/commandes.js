import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { POSTES } from './staff.js';

// Les commandes "/" que les membres voient en tapant "/" dans Discord.
export const commandes = [
  new SlashCommandBuilder().setName('aide').setDescription('Liste des commandes du bot'),
  new SlashCommandBuilder().setName('jouer').setDescription('Lien pour jouer au Mot Mystère'),
  new SlashCommandBuilder().setName('motdujour').setDescription('Numéro du mot du jour et lien du jeu'),
  new SlashCommandBuilder().setName('classement').setDescription('Top 10 des joueurs du Mot Mystère'),
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
].map((c) => c.toJSON());
