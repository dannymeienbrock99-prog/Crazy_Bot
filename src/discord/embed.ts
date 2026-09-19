import { EmbedBuilder } from 'discord.js';
import { getConfig } from '../config/store.js';
import type { EmbedConfig } from '../config/schema.js';

export function colorNumber(hex: string): number {
  return Number.parseInt(hex.replace('#', ''), 16);
}

export function buildEmbed(input: EmbedConfig): EmbedBuilder {
  const config = getConfig();
  const color = config.branding.lockEmbedAccentWhite
    ? '#FFFFFF'
    : (input.color || config.branding.embedAccentColor);

  const embed = new EmbedBuilder().setColor(colorNumber(color));

  if (input.title) embed.setTitle(input.title);
  if (input.description) embed.setDescription(input.description);
  if (input.author) embed.setAuthor({ name: input.author });
  if (input.footer) embed.setFooter({ text: input.footer });

  return embed;
}
