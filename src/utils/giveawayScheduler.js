import db from '../database.js';
import { endGiveaway } from './giveaways.js';

export function startGiveawayScheduler(client) {
  setInterval(async () => {
    const due = db
      .prepare('SELECT id FROM giveaways WHERE ended = 0 AND ends_at <= ?')
      .all(Date.now());

    for (const row of due) {
      await endGiveaway(client, row.id).catch(console.error);
    }
  }, 15_000);
}
