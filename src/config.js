import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  }
  return value;
}

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: process.env.GUILD_ID || null,

  welcome: {
    channelId: process.env.WELCOME_CHANNEL_ID || null,
    message:
      process.env.WELCOME_MESSAGE ||
      'Willkommen {user} auf **{server}**! Du bist Mitglied #{memberCount}.',
  },

  tickets: {
    categoryId: process.env.TICKET_CATEGORY_ID || null,
    supportRoleId: process.env.SUPPORT_ROLE_ID || null,
    logChannelId: process.env.TICKET_LOG_CHANNEL_ID || null,
  },

  giveaways: {
    defaultChannelId: process.env.GIVEAWAY_CHANNEL_ID || null,
  },
};
