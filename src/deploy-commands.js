import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { config } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const commands = [];
const commandsPath = join(__dirname, 'commands');

for (const folder of readdirSync(commandsPath)) {
  const folderPath = join(commandsPath, folder);
  for (const file of readdirSync(folderPath).filter((f) => f.endsWith('.js'))) {
    const command = (await import(pathToFileURL(join(folderPath, file)).href)).default;
    if (command?.data) {
      commands.push(command.data.toJSON());
    }
  }
}

const rest = new REST({ version: '10' }).setToken(config.token);

try {
  if (config.guildIds.length > 0) {
    // Register to multiple guilds if GUILD_ID is provided.
    for (const guildId of config.guildIds) {
      await rest.put(Routes.applicationGuildCommands(config.clientId, guildId), {
        body: commands,
      });
      console.log(`✅ ${commands.length} Slash-Commands registered on guild ${guildId}.`);
    }
  } else {
    // Register globally when no GUILD_ID is set.
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log(`✅ ${commands.length} Slash-Commands registered globally (can take up to 1 hour).`);
  }
} catch (error) {
  console.error('Error registering commands:', error);
  process.exit(1);
}
