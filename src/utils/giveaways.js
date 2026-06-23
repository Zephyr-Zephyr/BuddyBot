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
    .setTitle('🎉 Giveaway beendet!')
    .setDescription(
      winners.length
        ? `**Preis:** ${giveaway.prize}\n\n**Gewinner:** ${winners.map((id) => `<@${id}>`).join(', ')}\n\n_Gehostet von <@${giveaway.host_id}>_`
        : `**Preis:** ${giveaway.prize}\n\n❌ Keine gültigen Teilnehmer.\n\n_Gehostet von <@${giveaway.host_id}>_`
    );

  await message.edit({ embeds: [embed], components: [] });

  if (winners.length) {
    await channel.send({
      content: `🎊 Glückwunsch ${winners.map((id) => `<@${id}>`).join(', ')}! Ihr habt **${giveaway.prize}** gewonnen!`,
    });
  }

  return winners;
}

export function buildGiveawayEmbed({ prize, endsAt, hostId, winnerCount, ended = false, winners = [] }) {
  const embed = new EmbedBuilder()
    .setColor(ended ? 0x57f287 : 0x5865f2)
    .setTitle(ended ? '🎉 Giveaway beendet!' : '🎁 Giveaway')
    .setDescription(
      ended
        ? `**Preis:** ${prize}\n\n**Gewinner:** ${winners.length ? winners.map((id) => `<@${id}>`).join(', ') : 'Keine'}\n\n_Gehostet von <@${hostId}>_`
        : `**Preis:** ${prize}\n\n**Gewinner:** ${winnerCount}\n**Endet:** <t:${Math.floor(endsAt / 1000)}:R> (<t:${Math.floor(endsAt / 1000)}:F>)\n\nKlicke 🎉 um teilzunehmen!\n\n_Gehostet von <@${hostId}>_`
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
