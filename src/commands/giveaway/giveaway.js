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
    .setDescription('Giveaway-Verwaltung')
    .addSubcommand((sub) =>
      sub
        .setName('start')
        .setDescription('Startet ein neues Giveaway')
        .addStringOption((opt) => opt.setName('preis').setDescription('Was wird verlost?').setRequired(true))
        .addStringOption((opt) =>
          opt.setName('dauer').setDescription('z.B. 30m, 2h, 1d').setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt
            .setName('gewinner')
            .setDescription('Anzahl der Gewinner (Standard: 1)')
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
        .addChannelOption((opt) =>
          opt.setName('kanal').setDescription('Kanal (Standard: aktueller oder .env)').setRequired(false)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('end')
        .setDescription('Beendet ein Giveaway vorzeitig')
        .addStringOption((opt) =>
          opt.setName('nachricht_id').setDescription('Message-ID des Giveaways').setRequired(true)
        )
    )
    .addSubcommand((sub) =>
      sub
        .setName('reroll')
        .setDescription('Zieht neue Gewinner für ein beendetes Giveaway')
        .addStringOption((opt) =>
          opt.setName('nachricht_id').setDescription('Message-ID des Giveaways').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'start') {
      const prize = interaction.options.getString('preis');
      const durationStr = interaction.options.getString('dauer');
      const winnerCount = interaction.options.getInteger('gewinner') || 1;
      const channel =
        interaction.options.getChannel('kanal') ||
        (config.giveaways.defaultChannelId
          ? interaction.guild.channels.cache.get(config.giveaways.defaultChannelId)
          : null) ||
        interaction.channel;

      const ms = parseDuration(durationStr);
      if (!ms || ms < 10_000) {
        await interaction.reply({
          content: '❌ Ungültige Dauer. Beispiele: `30s`, `15m`, `2h`, `1d` (min. 10 Sekunden).',
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
          .setLabel('Teilnehmen')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎉')
      );

      const message = await channel.send({ embeds: [embed], components: [row] });

      db.prepare(
        'INSERT INTO giveaways (id, channel_id, message_id, prize, winner_count, ends_at, host_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(id, channel.id, message.id, prize, winnerCount, endsAt, interaction.user.id);

      await interaction.reply({ content: `✅ Giveaway in ${channel} gestartet!`, ephemeral: true });
      return;
    }

    if (sub === 'end' || sub === 'reroll') {
      const messageId = interaction.options.getString('nachricht_id');
      const giveaway = db
        .prepare('SELECT * FROM giveaways WHERE message_id = ? AND channel_id = ?')
        .get(messageId, interaction.channel.id);

      if (!giveaway) {
        await interaction.reply({
          content: '❌ Kein Giveaway mit dieser Message-ID in diesem Kanal gefunden.',
          ephemeral: true,
        });
        return;
      }

      const winners = await endGiveaway(interaction.client, giveaway.id, sub === 'reroll');
      if (!winners) {
        await interaction.reply({ content: '❌ Giveaway konnte nicht beendet werden.', ephemeral: true });
        return;
      }

      await interaction.reply({
        content:
          sub === 'reroll'
            ? `🔄 Neue Gewinner: ${winners.map((id) => `<@${id}>`).join(', ') || 'Keine'}`
            : `✅ Giveaway beendet. Gewinner: ${winners.map((id) => `<@${id}>`).join(', ') || 'Keine'}`,
        ephemeral: true,
      });
    }
  },
};
