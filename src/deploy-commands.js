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
  if (config.guildId) {
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
      body: commands,
    });
    console.log(`✅ ${commands.length} Slash-Commands auf Guild ${config.guildId} registriert.`);
  } else {
    await rest.put(Routes.applicationCommands(config.clientId), { body: commands });
    console.log(`✅ ${commands.length} Slash-Commands global registriert (kann bis 1h dauern).`);
  }
} catch (error) {
  console.error('Fehler beim Registrieren der Commands:', error);
  process.exit(1);
}
