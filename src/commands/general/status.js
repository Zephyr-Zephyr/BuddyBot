import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { getWebsiteStatus } from '../../utils/status.js';

export default {
  data: new SlashCommandBuilder()
    .setName('status')
    .setDescription('Zeigt den aktuellen Status der Pulse-Webseite an'),

  async execute(interaction) {
    const websiteUrl = process.env.PULSE_WEBSITE_URL || 'https://pulse.example.com';
    const status = await getWebsiteStatus(websiteUrl);

    const embed = new EmbedBuilder()
      .setColor(status.isOnline ? 0x57f287 : 0xfaa61a)
      .setTitle('🌐 Pulse Status')
      .setDescription(status.label)
      .addFields({ name: 'Details', value: status.detail })
      .setFooter({ text: `Geprüft: ${status.checkedUrl || 'nicht verfügbar'}` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
