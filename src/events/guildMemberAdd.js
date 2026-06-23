import { Events, EmbedBuilder } from 'discord.js';
import { config } from '../config.js';

export default {
  name: Events.GuildMemberAdd,
  async execute(member) {
    if (!config.welcome.channelId) return;

    const channel = member.guild.channels.cache.get(config.welcome.channelId);
    if (!channel?.isTextBased()) return;

    const text = config.welcome.message
      .replaceAll('{user}', `<@${member.id}>`)
      .replaceAll('{username}', member.user.username)
      .replaceAll('{server}', member.guild.name)
      .replaceAll('{memberCount}', String(member.guild.memberCount));

    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`👋 Willkommen auf ${member.guild.name}!`)
      .setDescription(text)
      .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
      .setFooter({ text: `Mitglied #${member.guild.memberCount}` })
      .setTimestamp();

    await channel.send({ embeds: [embed] }).catch(() => {});
  },
};
