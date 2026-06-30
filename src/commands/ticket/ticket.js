import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { TICKET_CREATE } from '../../utils/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket system')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Create the ticket panel with a button')
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel for the panel (default: current channel)').setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      const channel = interaction.options.getChannel('channel') || interaction.channel;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎫 Support Tickets')
        .setDescription(
          'Need help? Click the button below to open a private ticket.\n\nOur team will respond as soon as possible.'
        )
        .setFooter({ text: 'One ticket per person' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(TICKET_CREATE)
          .setLabel('Create Ticket')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Ticket panel created in ${channel}.`, ephemeral: true });
    }
  },
};
