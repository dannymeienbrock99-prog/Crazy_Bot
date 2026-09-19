import { SlashCommandBuilder } from 'discord.js';

export const commands = [
  new SlashCommandBuilder()
    .setName('bot')
    .setDescription('Bot-Informationen')
    .addSubcommand((sub) => sub.setName('status').setDescription('Zeigt den Bot-Status an.')),

  new SlashCommandBuilder()
    .setName('stempel')
    .setDescription('Erstellt einen Mod-Stempel.')
    .addStringOption((option) =>
      option.setName('titel').setDescription('Titel des Termins').setRequired(true).setMaxLength(100)
    )
    .addStringOption((option) =>
      option.setName('datum').setDescription('TT.MM.JJJJ').setRequired(true).setMaxLength(10)
    )
    .addStringOption((option) =>
      option.setName('uhrzeit').setDescription('HH:MM').setRequired(true).setMaxLength(5)
    )
    .addStringOption((option) =>
      option.setName('beschreibung').setDescription('Optionale Beschreibung').setRequired(false).setMaxLength(1000)
    ),

  new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('ʜᴀɴɢᴍᴀɴ Discord Game')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Startet Hangman.')
        .addStringOption((option) =>
          option.setName('kategorie').setDescription('Wort-Kategorie').setRequired(false)
        )
    )
    .addSubcommand((sub) => sub.setName('status').setDescription('Zeigt das laufende Spiel.'))
    .addSubcommand((sub) => sub.setName('stop').setDescription('Beendet das laufende Spiel.'))
].map((command) => command.toJSON());
