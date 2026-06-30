import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import db from '../database.js';
import { closeTicket } from '../utils/tickets.js';
import {
  handleRpsChoice,
  handleTttMove,
  handleGuessSubmit,
} from '../utils/minigames.js';
import {
  TICKET_CREATE,
  TICKET_CLOSE,
  GIVEAWAY_PREFIX,
  POLL_PREFIX,
  RPS_PREFIX,
} from '../utils/constants.js';

export async function handleButton(interaction) {
  const { customId } = interaction;

  if (customId === TICKET_CREATE) {
    const { createTicket } = await import('../utils/tickets.js');
    await createTicket(interaction);
    return;
  }

  if (customId === TICKET_CLOSE) {
    await closeTicket(interaction);
    return;
  }

  if (customId.startsWith(GIVEAWAY_PREFIX)) {
    const giveawayId = customId.slice(GIVEAWAY_PREFIX.length);
    const giveaway = db.prepare('SELECT * FROM giveaways WHERE id = ? AND ended = 0').get(giveawayId);

    if (!giveaway) {
      await interaction.reply({ content: '❌ This giveaway no longer exists.', ephemeral: true });
      return;
    }

    if (Date.now() >= giveaway.ends_at) {
      await interaction.reply({ content: '⏰ This giveaway has already ended.', ephemeral: true });
      return;
    }

    try {
      db.prepare('INSERT INTO giveaway_entries (giveaway_id, user_id) VALUES (?, ?)').run(
        giveawayId,
        interaction.user.id
      );
      await interaction.reply({ content: '🎉 You are now participating in the giveaway!', ephemeral: true });
    } catch {
      await interaction.reply({ content: 'ℹ️ You are already participating!', ephemeral: true });
    }
    return;
  }

  if (customId.startsWith(POLL_PREFIX)) {
    const [, pollId, optionIndexStr] = customId.split(':');
    const poll = db.prepare('SELECT * FROM polls WHERE id = ? AND closed = 0').get(pollId);

    if (!poll) {
      await interaction.reply({ content: '❌ This poll is no longer active.', ephemeral: true });
      return;
    }

    const optionIndex = Number(optionIndexStr);
    db.prepare(
      'INSERT INTO poll_votes (poll_id, user_id, option_index) VALUES (?, ?, ?) ON CONFLICT(poll_id, user_id) DO UPDATE SET option_index = excluded.option_index'
    ).run(pollId, interaction.user.id, optionIndex);

    await interaction.reply({ content: '✅ Your vote has been saved!', ephemeral: true });

    const options = JSON.parse(poll.options);
    const votes = db.prepare('SELECT option_index, COUNT(*) as count FROM poll_votes WHERE poll_id = ? GROUP BY option_index').all(pollId);
    const voteMap = Object.fromEntries(votes.map((v) => [v.option_index, v.count]));
    const total = votes.reduce((sum, v) => sum + v.count, 0);

    const lines = options.map((opt, i) => {
      const count = voteMap[i] || 0;
      const pct = total ? Math.round((count / total) * 100) : 0;
      const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
      return `**${i + 1}.** ${opt}\n${bar} ${count} (${pct}%)`;
    });

    const embed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(
      `**${poll.question}**\n\n${lines.join('\n\n')}\n\n_Total: ${total} vote(s)_`
    );

    await interaction.message.edit({ embeds: [embed] }).catch(() => {});
    return;
  }

  if (customId.startsWith(RPS_PREFIX)) {
    await handleRpsChoice(interaction, customId.slice(RPS_PREFIX.length));
    return;
  }

  if (customId.startsWith('ttt:')) {
    await handleTttMove(interaction, customId.slice(4));
  }
}

export async function handleModal(interaction) {
  if (interaction.customId.startsWith('guess_modal:')) {
    await handleGuessSubmit(interaction);
  }
}
