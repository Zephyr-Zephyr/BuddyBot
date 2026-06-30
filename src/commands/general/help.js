import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows all bot commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Discord Community Bot')
      .setDescription('Welcome · Tickets · Giveaways · Polls · Minigames')
      .addFields(
        {
          name: '🎫 Tickets',
          value: '`/ticket panel` – Create the ticket panel\nButton **Create Ticket** opens a private channel',
        },
        {
          name: '🎁 Giveaways',
          value:
            '`/giveaway start` – Start a giveaway\n`/giveaway end` – End early\n`/giveaway reroll` – Pick new winners',
        },
        {
          name: '📊 Polls',
          value: '`/poll create` – Create a poll with up to 5 options\n`/poll close` – Close a poll',
        },
        {
          name: '🎮 Minigames',
          value:
            '`/minigame rps` – Rock, Paper, Scissors\n`/minigame tictactoe` – Tic-Tac-Toe vs bot\n`/minigame guess` – Guess a number (1–100)\n`/minigame trivia` + `/minigame answer` – Trivia quiz',
        },
        {
          name: '📡 Status',
          value: '`/status` – Check the current status of the Pulse website',
        },
        {
          name: '👋 Welcome',
          value: 'Automatic greeting for new members (configure the channel in `.env`)',
        }
      )
      .setFooter({ text: 'Setup: see README.md' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
