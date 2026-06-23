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
    .setDescription('Ticket-System')
    .addSubcommand((sub) =>
      sub
        .setName('panel')
        .setDescription('Erstellt das Ticket-Panel mit Button')
        .addChannelOption((opt) =>
          opt.setName('kanal').setDescription('Kanal für das Panel (Standard: aktueller Kanal)').setRequired(false)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'panel') {
      const channel = interaction.options.getChannel('kanal') || interaction.channel;

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('🎫 Support-Tickets')
        .setDescription(
          'Brauchst du Hilfe? Klicke auf den Button unten, um ein privates Ticket zu eröffnen.\n\nUnser Team meldet sich so schnell wie möglich.'
        )
        .setFooter({ text: 'Ein Ticket pro Person' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(TICKET_CREATE)
          .setLabel('Ticket erstellen')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🎫')
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.reply({ content: `✅ Ticket-Panel in ${channel} erstellt.`, ephemeral: true });
    }
  },
};
