import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Zeigt alle Bot-Befehle an'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('📖 Discord Community Bot')
      .setDescription('Welcome · Tickets · Giveaways · Umfragen · Minigames')
      .addFields(
        {
          name: '🎫 Tickets',
          value: '`/ticket panel` – Ticket-Panel erstellen\nButton **Ticket erstellen** öffnet einen privaten Kanal',
        },
        {
          name: '🎁 Giveaways',
          value:
            '`/giveaway start` – Giveaway starten\n`/giveaway end` – Vorzeitig beenden\n`/giveaway reroll` – Neue Gewinner ziehen',
        },
        {
          name: '📊 Umfragen',
          value: '`/umfrage erstellen` – Umfrage mit bis zu 5 Optionen\n`/umfrage beenden` – Umfrage schließen',
        },
        {
          name: '🎮 Minigames',
          value:
            '`/minigame rps` – Schere, Stein, Papier\n`/minigame tictactoe` – Tic-Tac-Toe vs Bot\n`/minigame zahlen` – Zahl raten (1–100)\n`/minigame trivia` + `/minigame antworten` – Quiz',
        },
        {
          name: '� Status',
          value: '`/status` – Prüft den aktuellen Status der Pulse-Webseite und zeigt den Entwicklungsstatus an',
        },
        {
          name: '�👋 Welcome',
          value: 'Automatische Begrüßung bei neuen Mitgliedern (Kanal in `.env` konfigurieren)',
        }
      )
      .setFooter({ text: 'Setup: siehe README.md' });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
