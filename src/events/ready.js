import { Events } from 'discord.js';
import { config } from '../config.js';

export default {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`🤖 Logged in as ${client.user.tag}`);
    client.user.setActivity('Community | /help', { type: 3 });
  },
};
