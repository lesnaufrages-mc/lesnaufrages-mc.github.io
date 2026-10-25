import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

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
].map((c) => c.toJSON());
