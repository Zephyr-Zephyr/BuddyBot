import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');
const storePath = join(dataDir, 'store.json');

if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

const defaultStore = {
  giveaways: [],
  giveaway_entries: [],
  polls: [],
  poll_votes: [],
  tickets: [],
};

function load() {
  if (!existsSync(storePath)) return structuredClone(defaultStore);
  return { ...defaultStore, ...JSON.parse(readFileSync(storePath, 'utf8')) };
}

function save(data) {
  writeFileSync(storePath, JSON.stringify(data, null, 2));
}

export default {
  prepare(sql) {
    return {
      get(...params) {
        const data = load();
        if (sql.includes('FROM giveaways WHERE id = ? AND ended = 0')) {
          return data.giveaways.find((g) => g.id === params[0] && g.ended === 0) || undefined;
        }
        if (sql.includes('FROM giveaways WHERE id = ?')) {
          return data.giveaways.find((g) => g.id === params[0]) || undefined;
        }
        if (sql.includes('FROM giveaways WHERE message_id = ? AND channel_id = ?')) {
          return data.giveaways.find((g) => g.message_id === params[0] && g.channel_id === params[1]) || undefined;
        }
        if (sql.includes('FROM polls WHERE id = ? AND closed = 0')) {
          return data.polls.find((p) => p.id === params[0] && p.closed === 0) || undefined;
        }
        if (sql.includes('FROM polls WHERE message_id = ? AND channel_id = ? AND closed = 0')) {
          return (
            data.polls.find(
              (p) => p.message_id === params[0] && p.channel_id === params[1] && p.closed === 0
            ) || undefined
          );
        }
        if (sql.includes('FROM tickets WHERE user_id = ? AND closed = 0')) {
          return data.tickets.find((t) => t.user_id === params[0] && t.closed === 0) || undefined;
        }
        if (sql.includes('FROM tickets WHERE channel_id = ? AND closed = 0')) {
          return data.tickets.find((t) => t.channel_id === params[0] && t.closed === 0) || undefined;
        }
        return undefined;
      },

      all(...params) {
        const data = load();
        if (sql.includes('FROM giveaways WHERE ended = 0 AND ends_at <= ?')) {
          return data.giveaways.filter((g) => g.ended === 0 && g.ends_at <= params[0]).map((g) => ({ id: g.id }));
        }
        if (sql.includes('FROM giveaway_entries WHERE giveaway_id = ?')) {
          return data.giveaway_entries.filter((e) => e.giveaway_id === params[0]);
        }
        if (sql.includes('FROM poll_votes WHERE poll_id = ? GROUP BY option_index')) {
          const votes = data.poll_votes.filter((v) => v.poll_id === params[0]);
          const counts = {};
          for (const v of votes) counts[v.option_index] = (counts[v.option_index] || 0) + 1;
          return Object.entries(counts).map(([option_index, count]) => ({
            option_index: Number(option_index),
            count,
          }));
        }
        return [];
      },

      run(...params) {
        const data = load();

        if (sql.includes('INSERT INTO giveaway_entries')) {
          const exists = data.giveaway_entries.some(
            (e) => e.giveaway_id === params[0] && e.user_id === params[1]
          );
          if (exists) throw new Error('duplicate');
          data.giveaway_entries.push({ giveaway_id: params[0], user_id: params[1] });
        } else if (sql.includes('INSERT INTO giveaways')) {
          data.giveaways.push({
            id: params[0],
            channel_id: params[1],
            message_id: params[2],
            prize: params[3],
            winner_count: params[4],
            ends_at: params[5],
            host_id: params[6],
            ended: 0,
          });
        } else if (sql.includes('UPDATE giveaways SET ended = 1')) {
          const g = data.giveaways.find((x) => x.id === params[0]);
          if (g) g.ended = 1;
        } else if (sql.includes('INSERT INTO polls')) {
          data.polls.push({
            id: params[0],
            channel_id: params[1],
            message_id: params[2],
            question: params[3],
            options: params[4],
            creator_id: params[5],
            closed: 0,
          });
        } else if (sql.includes('INSERT INTO poll_votes') || sql.includes('ON CONFLICT')) {
          const existing = data.poll_votes.find(
            (v) => v.poll_id === params[0] && v.user_id === params[1]
          );
          if (existing) existing.option_index = params[2];
          else data.poll_votes.push({ poll_id: params[0], user_id: params[1], option_index: params[2] });
        } else if (sql.includes('UPDATE polls SET closed = 1')) {
          const p = data.polls.find((x) => x.id === params[0]);
          if (p) p.closed = 1;
        } else if (sql.includes('INSERT INTO tickets')) {
          data.tickets.push({
            channel_id: params[0],
            user_id: params[1],
            topic: params[2],
            created_at: params[3],
            closed: 0,
          });
        } else if (sql.includes('UPDATE tickets SET closed = 1')) {
          const t = data.tickets.find((x) => x.channel_id === params[0]);
          if (t) t.closed = 1;
        }

        save(data);
      },
    };
  },
};
