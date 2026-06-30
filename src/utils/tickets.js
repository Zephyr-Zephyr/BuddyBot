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
        content: `ℹ️ You already have an open ticket: ${ch}`,
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
    topic: `Ticket from ${interaction.user.tag}`,
    permissionOverwrites,
  });

  db.prepare(
    'INSERT INTO tickets (channel_id, user_id, topic, created_at) VALUES (?, ?, ?, ?)'
  ).run(channel.id, interaction.user.id, 'Support', Date.now());

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🎫 Support Ticket')
    .setDescription(
      `Hello ${interaction.user}!\n\nDescribe your issue. The team will help you as soon as possible.\n\nClick **Close Ticket** when your problem is solved.`
    )
    .setTimestamp();

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(TICKET_CLOSE)
      .setLabel('Close Ticket')
      .setStyle(ButtonStyle.Danger)
      .setEmoji('🔒')
  );

  await channel.send({ content: `${interaction.user}${supportRoleId ? ` | <@&${supportRoleId}>` : ''}`, embeds: [embed], components: [row] });
  await interaction.editReply({ content: `✅ Ticket created: ${channel}` });
}

export async function closeTicket(interaction) {
  const ticket = db.prepare('SELECT * FROM tickets WHERE channel_id = ? AND closed = 0').get(interaction.channel.id);

  if (!ticket) {
    await interaction.reply({ content: '❌ This is not an active ticket.', ephemeral: true });
    return;
  }

  const isOwner = ticket.user_id === interaction.user.id;
  const isStaff =
    config.tickets.supportRoleId &&
    interaction.member.roles.cache.has(config.tickets.supportRoleId);
  const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.ManageChannels);

  if (!isOwner && !isStaff && !isAdmin) {
    await interaction.reply({ content: '❌ You are not allowed to close this ticket.', ephemeral: true });
    return;
  }

  await interaction.reply({ content: '🔒 Ticket will be closed in 5 seconds...' });
  db.prepare('UPDATE tickets SET closed = 1 WHERE channel_id = ?').run(interaction.channel.id);

  if (config.tickets.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.tickets.logChannelId);
    if (logChannel?.isTextBased()) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xed4245)
            .setTitle('Ticket Closed')
            .addFields(
              { name: 'Channel', value: interaction.channel.name, inline: true },
              { name: 'Closed by', value: `<@${interaction.user.id}>`, inline: true },
              { name: 'Creator', value: `<@${ticket.user_id}>`, inline: true }
            )
            .setTimestamp(),
        ],
      });
    }
  }

  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
}
