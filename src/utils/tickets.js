import {
  ChannelType,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import db from '../database.js';
import { config } from '../config.js';
import { TICKET_CLOSE } from './constants.js';

export async function createTicket(interaction) {
  const existing = db
    .prepare('SELECT channel_id FROM tickets WHERE user_id = ? AND closed = 0')
    .get(interaction.user.id);

  if (existing) {
    const ch = interaction.guild.channels.cache.get(existing.channel_id);
    if (ch) {
      await interaction.reply({
        content: `ℹ️ Du hast bereits ein offenes Ticket: ${ch}`,
        ephemeral: true,
      });
      return;
    }
  }

  await interaction.deferReply({ ephemeral: true });

  const categoryId = config.tickets.categoryId;
  const supportRoleId = config.tickets.supportRoleId;

  const permissionOverwrites = [
    { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  if (supportRoleId) {
    permissionOverwrites.push({
      id: supportRoleId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
      ],
    });
  }

  const channel = await interaction.guild.channels.create({
    name: `ticket-${interaction.user.username}`.slice(0, 100).toLowerCase().replace(/[^a-z0-9-]/g, '-'),
    type: ChannelType.GuildText,
    parent: categoryId || undefined,
    topic: `Ticket von ${interaction.user.tag}`,
    permissionOverwrites,
  });

  db.prepare(
    'INSERT INTO tickets (channel_id, user_id, topic, created_at) VALUES (?, ?, ?, ?)'
  ).run(channel.id, interaction.user.id, 'Support', Date.now());

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Support-Ticket')
    .setDescription(
      `Hallo ${interaction.user}!\n\nBeschreibe dein Anliegen. Das Team hilft dir so schnell wie möglich.\n\nKlicke **Ticket schließen**, wenn dein Problem gelöst ist.`
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(TICKET_CLOSE)
      .setLabel('Ticket schließen')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  await channel.send({ content: `${interaction.user}${supportRoleId ? ` | <@&${supportRoleId}>` : ''}`, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Ticket erstellt: ${channel}` });
}

export async function closeTicket(interaction) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND closed = 0').get(interaction.channel.id);

  if (!ticket) {
    await interaction.reply({ content: '❌ Dies ist kein aktives Ticket.', ephemeral: true });
    return;
  }

  const isOwner = ticket.user_id === interaction.user.id;
  const isStaff =
    config.tickets.supportRoleId &&
    interaction.member.roles.cache.has(config.tickets.supportRoleId);
  const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);

  if (!isOwner && !isStaff && !isAdmin) {
    await interaction.reply({ content: '❌ Du darfst dieses Ticket nicht schließen.', ephemeral: true });
    return;
  }

  await interaction.reply({ content: '🔒 Ticket wird in 5 Sekunden geschlossen...' });
  db.prepare('UPDATE tickets SET closed = 1 WHERE channel_id = ?').run(interaction.channel.id);

  if (config.tickets.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.tickets.logChannelId);
    if (logChannel?.isTextBased()) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('Ticket geschlossen')
            .addFields(
              { name: 'Kanal', value: interaction.channel.name, inline: true },
              { name: 'Geschlossen von', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Ersteller', value: `<@${ticket.user_id}>`, inline: true }
            )
            .setTimestamp(),
        ],
      });
    }
  }

  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}
