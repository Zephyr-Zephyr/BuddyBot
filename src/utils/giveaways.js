import { EmbedBuilder } from 'discord.js';
import db from '../database.js';

export function pickWinners(giveawayId, count) {
  const entries = db
    .prepare('SELECT user_id FROM giveaway_entries WHERE giveaway_id = ?')
    .all(giveawayId)
    .map((e) => e.user_id);

  if (!entries.length) return [];

  const shuffled = [...entries].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

export async function endGiveaway(client, giveawayId, reroll = false) {
  const giveaway = db.prepare('SELECT * FROM giveaways WHERE id = ?').get(giveawayId);
  if (!giveaway || (giveaway.ended && !reroll)) return null;

  const channel = await client.channels.fetch(giveaway.channel_id).catch(() => null);
  if (!channel?.isTextBased()) return null;

  const message = await channel.messages.fetch(giveaway.message_id).catch(() => null);
  if (!message) return null;

  const winners = pickWinners(giveawayId, giveaway.winner_count);

  if (!reroll) {
    db.prepare('UPDATE giveaways SET ended = 1 WHERE id = ?').run(giveawayId);
  }

  const embed = EmbedBuilder.from(message.embeds[0])
    .setColor(winners.length ? 0x57f287 : 0xed4245)
    .setTitle('🎉 Giveaway Ended!')
    .setDescription(
      winners.length
        ? `**Prize:** ${giveaway.prize}\n\n**Winners:** ${winners.map((id) => `<@${id}>`).join(', ')}\n\n_Hosted by <@${giveaway.host_id}>_`
        : `**Prize:** ${giveaway.prize}\n\n❌ No valid participants.\n\n_Hosted by <@${giveaway.host_id}>_`
    );

  await message.edit({ embeds: [embed], components: [] });

  if (winners.length) {
    await channel.send({
      content: `🎊 Congratulations ${winners.map((id) => `<@${id}>`).join(', ')}! You won **${giveaway.prize}**!`,
    });
  }

  return winners;
}

export function buildGiveawayEmbed({ prize, endsAt, hostId, winnerCount, ended = false, winners = [] }) {
  const embed = new EmbedBuilder()
    .setColor(ended ? 0x57f287 : 0x5865f2)
    .setTitle(ended ? '🎉 Giveaway Ended!' : '🎁 Giveaway')
    .setDescription(
      ended
        ? `**Prize:** ${prize}\n\n**Winners:** ${winners.length ? winners.map((id) => `<@${id}>`).join(', ') : 'None'}\n\n_Hosted by <@${hostId}>_`
        : `**Prize:** ${prize}\n\n**Winners:** ${winnerCount}\n**Ends:** <t:${Math.floor(endsAt / 1000)}:R> (<t:${Math.floor(endsAt / 1000)}:F>)\n\nClick 🎉 to participate!\n\n_Hosted by <@${hostId}>_`
    )
    .setTimestamp(ended ? undefined : new Date(endsAt));

  return embed;
}

export function parseDuration(input) {
  const match = input.match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * multipliers[unit];
}
