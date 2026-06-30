import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

// Parse multiple guild IDs (comma-separated) if provided, otherwise leave empty for global registration.
const guildIdStr = process.env.GUILD_ID || null;
const guildIds = guildIdStr ? guildIdStr.split(',').map((id) => id.trim()).filter(Boolean) : [];

export const config = {
  token: required('DISCORD_TOKEN'),
  clientId: required('CLIENT_ID'),
  guildId: null,
  guildIds: guildIds,

  welcome: {
    channelId: process.env.WELCOME_CHANNEL_ID || null,
    message:
      process.env.WELCOME_MESSAGE ||
      'Welcome {user} to **{server}**! You are member #{memberCount}.',
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
