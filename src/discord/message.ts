import path from 'node:path';
import { AttachmentBuilder, type EmbedBuilder } from 'discord.js';
import type { EmbedConfig } from '../config/schema.js';
import { getAsset, getAssetAbsolutePath } from '../assets/store.js';
import { buildEmbed } from './embed.js';

export type EmbedPacket = {
  embed: EmbedBuilder;
  files: AttachmentBuilder[];
};

export function buildEmbedPacket(input: EmbedConfig): EmbedPacket {
  const embed = buildEmbed(input);
  const files: AttachmentBuilder[] = [];
  const attached = new Map<string, string>();

  const attach = (assetId: string | null | undefined, prefix: string): string | null => {
    if (!assetId) return null;
    if (attached.has(assetId)) return attached.get(assetId) ?? null;

    const asset = getAsset(assetId);
    const absolute = getAssetAbsolutePath(assetId);
    if (!asset || !absolute) return null;

    const extension = path.extname(asset.path) || '.img';
    const name = `${prefix}-${asset.id}${extension}`;
    files.push(new AttachmentBuilder(absolute, { name }));
    attached.set(assetId, name);
    return name;
  };

  const image = attach(input.imageAssetId, 'embed-image');
  if (image) embed.setImage(`attachment://${image}`);

  const thumbnail = attach(input.thumbnailAssetId, 'embed-thumb');
  if (thumbnail) embed.setThumbnail(`attachment://${thumbnail}`);

  return { embed, files };
}
