import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config } from './config.js';
import { startGiveawayScheduler } from './utils/giveawayScheduler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.GuildMember],
});

client.commands = new Collection();

const commandsPath = join(__dirname, 'commands');
for (const folder of readdirSync(commandsPath)) {
  const folderPath = join(commandsPath, folder);
  for (const file of readdirSync(folderPath).filter((f) => f.endsWith('.js'))) {
    const command = (await import(pathToFileURL(join(folderPath, file)).href)).default;
    if (command?.data && command?.execute) {
      client.commands.set(command.data.name, command);
    }
  }
}

const eventsPath = join(__dirname, 'events');
for (const file of readdirSync(eventsPath).filter((f) => f.endsWith('.js'))) {
  const event = (await import(pathToFileURL(join(eventsPath, file)).href)).default;
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

startGiveawayScheduler(client);

client.login(config.token);
