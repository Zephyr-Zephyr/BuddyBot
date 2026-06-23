import { SlashCommandBuilder } from 'discord.js';
import {
  startRps,
  startTtt,
  startGuess,
  startTrivia,
  answerTrivia,
} from '../../utils/minigames.js';

export default {
  data: new SlashCommandBuilder()
    .setName('minigame')
    .setDescription('Minigames spielen')
    .addSubcommand((sub) => sub.setName('rps').setDescription('Schere, Stein, Papier gegen den Bot'))
    .addSubcommand((sub) => sub.setName('tictactoe').setDescription('Tic-Tac-Toe gegen den Bot'))
    .addSubcommand((sub) => sub.setName('zahlen').setDescription('Rate eine Zahl zwischen 1 und 100'))
    .addSubcommand((sub) => sub.setName('trivia').setDescription('Starte eine Quiz-Frage'))
    .addSubcommand((sub) =>
      sub
        .setName('antworten')
        .setDescription('Antwort auf eine aktive Trivia-Frage')
        .addStringOption((opt) => opt.setName('text').setDescription('Deine Antwort').setRequired(true))
    ),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    switch (sub) {
      case 'rps':
        await startRps(interaction);
        break;
      case 'tictactoe':
        await startTtt(interaction);
        break;
      case 'zahlen':
        await startGuess(interaction);
        break;
      case 'trivia':
        await startTrivia(interaction);
        break;
      case 'antworten':
        await answerTrivia(interaction, interaction.options.getString('text'));
        break;
    }
  },
};
