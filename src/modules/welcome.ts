import { AttachmentBuilder, type GuildMember, type PartialGuildMember } from 'discord.js';
import { getConfig } from '../config/store.js';
import { buildEmbedPacket } from '../discord/message.js';
import { renderTemplate } from '../utils/template.js';
import { renderWelcomeImage } from '../services/welcome-image.js';
import { log } from '../core/logger.js';

function values(member: GuildMember | PartialGuildMember) {
  return {
    mention: `<@${member.id}>`,
    username: member.user?.username ?? member.id,
    user: member.user?.tag ?? member.id,
    server: member.guild.name,
    memberCount: member.guild.memberCount
  };
}

export async function handleJoin(member: GuildMember): Promise<void> {
  const config = getConfig().welcome;
  const vars = values(member);

  if (config.enabled && config.channelId) {
    const channel = await member.guild.channels.fetch(config.channelId).catch(() => null);
    if (channel?.isTextBased() && 'send' in channel) {
      const packet = buildEmbedPacket({
        ...config.embed,
        title: renderTemplate(config.embed.title, vars),
        description: renderTemplate(config.embed.description, vars)
      });
      const embed = packet.embed;
      const files: AttachmentBuilder[] = [...packet.files];
      if (config.dynamicImage.enabled) {
        try {
          const image = await renderWelcomeImage(member);
          files.push(new AttachmentBuilder(image, { name: 'welcome.png' }));
          embed.setImage('attachment://welcome.png');
        } catch (error) {
          log.warn('Welcome-Bild konnte nicht erstellt werden.', String(error));
        }
      }

      await channel.send({
        content: renderTemplate(config.content, vars),
        embeds: config.embed.enabled ? [embed] : [],
        files
      });
    }
  }

  if (config.log.joinEnabled && config.log.channelId) {
    const logChannel = await member.guild.channels.fetch(config.log.channelId).catch(() => null);
    if (logChannel?.isTextBased() && 'send' in logChannel) {
      await logChannel.send(renderTemplate(config.log.joinText, vars));
    }
  }
}

export async function handleLeave(member: GuildMember | PartialGuildMember): Promise<void> {
  const config = getConfig().welcome;
  if (!config.log.leaveEnabled || !config.log.channelId) return;

  const channel = await member.guild.channels.fetch(config.log.channelId).catch(() => null);
  if (channel?.isTextBased() && 'send' in channel) {
    await channel.send(renderTemplate(config.log.leaveText, values(member)));
  }
}
