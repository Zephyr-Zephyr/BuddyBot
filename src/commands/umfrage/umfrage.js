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
    .setName('umfrage')
    .setDescription('Umfragen erstellen und verwalten')
    .addSubcommand((sub) =>
      sub
        .setName('erstellen')
        .setDescription('Erstellt eine neue Umfrage')
        .addStringOption((opt) => opt.setName('frage').setDescription('Die Frage').setRequired(true))
        .addStringOption((opt) => opt.setName('option1').setDescription('Option 1').setRequired(true))
        .addStringOption((opt) => opt.setName('option2').setDescription('Option 2').setRequired(true))
        .addStringOption((opt) => opt.setName('option3').setDescription('Option 3').setRequired(false))
        .addStringOption((opt) => opt.setName('option4').setDescription('Option 4').setRequired(false))
        .addStringOption((opt) => opt.setName('option5').setDescription('Option 5').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('beenden')
        .setDescription('Beendet eine Umfrage')
        .addStringOption((opt) =>
          opt.setName('nachricht_id').setDescription('Message-ID der Umfrage').setRequired(true)
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === 'erstellen') {
      const question = interaction.options.getString('frage');
      const options = [1, 2, 3, 4, 5]
        .map((n) => interaction.options.getString(`option${n}`))
        .filter(Boolean);

      if (options.length < 2) {
        await interaction.reply({ content: '❌ Mindestens 2 Optionen erforderlich.', ephemeral: true });
        return;
      }

      const id = randomUUID();
      const lines = options.map((opt, i) => `**${i + 1}.** ${opt}\n░░░░░░░░░░ 0 (0%)`);

      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle('📊 Umfrage')
        .setDescription(`**${question}**\n\n${lines.join('\n\n')}\n\n_Gesamt: 0 Stimme(n)_`)
        .setFooter({ text: `Erstellt von ${interaction.user.username}` })
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

      await interaction.reply({ content: '✅ Umfrage erstellt!', ephemeral: true });
      return;
    }

    if (sub === 'beenden') {
      const messageId = interaction.options.getString('nachricht_id');
      const poll = db
        .prepare('SELECT * FROM polls WHERE message_id = ? AND channel_id = ? AND closed = 0')
        .get(messageId, interaction.channel.id);

      if (!poll) {
        await interaction.reply({ content: '❌ Keine aktive Umfrage gefunden.', ephemeral: true });
        return;
      }

      db.prepare('UPDATE polls SET closed = 1 WHERE id = ?').run(poll.id);

      const message = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (message) {
        await message.edit({ components: [] }).catch(() => {});
      }

      await interaction.reply({ content: '✅ Umfrage beendet. Abstimmung ist geschlossen.', ephemeral: true });
    }
  },
};
