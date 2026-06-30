import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { randomUUID } from 'crypto';
import db from '../../database.js';
import { POLL_PREFIX } from '../../utils/constants.js';

export default {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create and manage polls')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new poll')
        .addStringOption((opt) => opt.setName('question').setDescription('The question').setRequired(true))
        .addStringOption((opt) => opt.setName('option1').setDescription('Option 1').setRequired(true))
        .addStringOption((opt) => opt.setName('option2').setDescription('Option 2').setRequired(true))
        .addStringOption((opt) => opt.setName('option3').setDescription('Option 3').setRequired(false))
        .addStringOption((opt) => opt.setName('option4').setDescription('Option 4').setRequired(false))
        .addStringOption((opt) => opt.setName('option5').setDescription('Option 5').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Close a poll')
        .addStringOption((opt) =>
          opt.setName('message_id').setDescription('Message ID of the poll').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'create') {
      const question = interaction.options.getString('question');
      const options = [1, 2, 3, 4, 5]
        .map((n) => interaction.options.getString(`option${n}`))
        .filter(Boolean);

      if (options.length < 2) {
        await interaction.reply({ content: '❌ At least 2 options required.', ephemeral: true });
        return;
      }

      const id = randomUUID();
      const lines = options.map((opt, i) => `**${i + 1}.** ${opt}\n░░░░░░░░░░ 0 (0%)`);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📊 Poll')
        .setDescription(`**${question}**\n\n${lines.join('\n\n')}\n\n_Total: 0 vote(s)_`)
        .setFooter({ text: `Created by ${interaction.user.username}` })
        .setTimestamp();

      const rows = [];
      let currentRow = new ActionRowBuilder();

      options.forEach((opt, i) => {
        if (currentRow.components.length >= 5) {
          rows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`${POLL_PREFIX}${id}:${i}`)
            .setLabel(opt.slice(0, 80))
            .setStyle(ButtonStyle.Secondary)
        );
      });
      if (currentRow.components.length) rows.push(currentRow);

      const message = await interaction.channel.send({ embeds: [embed], components: rows });

      db.prepare(
        'INSERT INTO polls (id, channel_id, message_id, question, options, creator_id) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(id, interaction.channel.id, message.id, question, JSON.stringify(options), interaction.user.id);

      await interaction.reply({ content: '✅ Poll created!', ephemeral: true });
      return;
    }

    if (sub === 'close') {
      const messageId = interaction.options.getString('message_id');
      const poll = db
        .prepare('SELECT * FROM polls WHERE message_id = ? AND channel_id = ? AND closed = 0')
        .get(messageId, interaction.channel.id);

      if (!poll) {
        await interaction.reply({ content: '❌ No active poll found.', ephemeral: true });
        return;
      }

      db.prepare('UPDATE polls SET closed = 1 WHERE id = ?').run(poll.id);

      const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        await message.edit({ components: [] }).catch(() => {});
      }

      await interaction.reply({ content: '✅ Poll closed. Voting is no longer possible.', ephemeral: true });
    }
  },
};
