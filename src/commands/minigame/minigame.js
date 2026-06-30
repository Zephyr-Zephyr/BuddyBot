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
    .setDescription('Play minigames')
    .addSubcommand((sub) => sub.setName('rps').setDescription('Rock, Paper, Scissors against the bot'))
    .addSubcommand((sub) => sub.setName('tictactoe').setDescription('Tic-Tac-Toe against the bot'))
    .addSubcommand((sub) => sub.setName('guess').setDescription('Guess a number between 1 and 100'))
    .addSubcommand((sub) => sub.setName('trivia').setDescription('Start a trivia question'))
    .addSubcommand((sub) =>
      sub
        .setName('answer')
        .setDescription('Answer an active trivia question')
        .addStringOption((opt) => opt.setName('text').setDescription('Your answer').setRequired(true))
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
      case 'guess':
        await startGuess(interaction);
        break;
      case 'trivia':
        await startTrivia(interaction);
        break;
      case 'answer':
        await answerTrivia(interaction, interaction.options.getString('text'));
        break;
    }
  },
};
