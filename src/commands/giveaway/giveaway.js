import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { randomUUID } from 'crypto';
import db from '../../database.js';
import { config } from '../../config.js';
import {
  buildGiveawayEmbed,
  endGiveaway,
  parseDuration,
} from '../../utils/giveaways.js';
import { GIVEAWAY_PREFIX } from '../../utils/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('giveaway')
    .setDescription('Giveaway management')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Start a new giveaway')
        .addStringOption((opt) => opt.setName('prize').setDescription('What is being given away?').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('duration').setDescription('e.g., 30m, 2h, 1d').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('winners')
            .setDescription('Number of winners (default: 1)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt.setName('channel').setDescription('Channel (default: current or .env)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('End a giveaway early')
        .addStringOption((opt) =>
          opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Pick new winners for an ended giveaway')
        .addStringOption((opt) =>
          opt.setName('message_id').setDescription('Message ID of the giveaway').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('prize');
      const durationStr = interaction.options.getString('duration');
      const winnerCount = interaction.options.getInteger('winners') || 1;
      const channel =
        interaction.options.getChannel('channel') ||
        (config.giveaways.defaultChannelId
          ? interaction.guild.channels.cache.get(config.giveaways.defaultChannelId)
          : null) ||
        interaction.channel;

      const ms = parseDuration(durationStr);
      if (!ms || ms < 10_000) {
        await interaction.reply({
          content: '❌ Invalid duration. Examples: `30s`, `15m`, `2h`, `1d` (minimum: 10 seconds).',
          ephemeral: true,
        });
        return;
      }

      const endsAt = Date.now() + ms;
      const id = randomUUID();

      const embed = buildGiveawayEmbed({
        prize,
        endsAt,
        hostId: interaction.user.id,
        winnerCount,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`${GIVEAWAY_PREFIX}${id}`)
          .setLabel('Enter')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

      const message = await channel.send({ embeds: [embed], components: [row] });

      db.prepare(
        'INSERT INTO giveaways (id, channel_id, message_id, prize, winner_count, ends_at, host_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, channel.id, message.id, prize, winnerCount, endsAt, interaction.user.id);

      await interaction.reply({ content: `✅ Giveaway started in ${channel}!`, ephemeral: true });
      return;
    }

    if (sub === 'end' || sub === 'reroll') {
      const messageId = interaction.options.getString('message_id');
      const giveaway = db
        .prepare('SELECT * FROM giveaways WHERE message_id = ? AND channel_id = ?')
        .get(messageId, interaction.channel.id);

      if (!giveaway) {
        await interaction.reply({
          content: '❌ No giveaway with this message ID found in this channel.',
          ephemeral: true,
        });
        return;
      }

      const winners = await endGiveaway(interaction.client, giveaway.id, sub === 'reroll');
      if (!winners) {
        await interaction.reply({ content: '❌ Could not end giveaway.', ephemeral: true });
        return;
      }

      await interaction.reply({
        content:
          sub === 'reroll'
            ? `🔄 New winners: ${winners.map((id) => `<@${id}>`).join(', ') || 'None'}`
            : `✅ Giveaway ended. Winners: ${winners.map((id) => `<@${id}>`).join(', ') || 'None'}`,
        ephemeral: true,
      });
    }
  },
};
