import type { Guild } from 'discord.js';
import { buildEmbed } from '../discord/embed.js';
import { getConfig, updateConfig } from '../config/store.js';

const order = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

export async function publishStreamPlan(guild: Guild): Promise<string> {
  const config = getConfig().streamPlan;
  if (!config.channelId) throw new Error('Kein Streamplan-Kanal ausgewählt.');

  const channel = await guild.channels.fetch(config.channelId);
  if (!channel?.isTextBased() || !('send' in channel)) throw new Error('Streamplan-Kanal ist ungültig.');

  const entries = [...config.entries].sort((a, b) => {
    const day = order.indexOf(a.day) - order.indexOf(b.day);
    return day || a.time.localeCompare(b.time);
  });

  const description = entries.length
    ? entries.map((entry) =>
        `**${entry.day} · ${entry.time} Uhr** — ${entry.title} · ${entry.platform}${entry.note ? `\n↳ ${entry.note}` : ''}`
      ).join('\n\n')
    : 'Noch keine Streams eingetragen.';

  const embed = buildEmbed(config.embed).setDescription(description);
  const old = config.messageId
    ? await channel.messages.fetch(config.messageId).catch(() => null)
    : null;
  const message = old ? await old.edit({ embeds: [embed] }) : await channel.send({ embeds: [embed] });

  updateConfig((next) => {
    next.streamPlan.messageId = message.id;
    return next;
  });
  return message.id;
}
