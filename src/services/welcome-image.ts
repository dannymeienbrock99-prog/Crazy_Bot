import sharp from 'sharp';
import type { GuildMember } from 'discord.js';
import { getConfig } from '../config/store.js';
import { getAssetAbsolutePath } from '../assets/store.js';
import { renderTemplate } from '../utils/template.js';

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (char) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;'
  })[char] ?? char);
}

async function avatarBuffer(member: GuildMember): Promise<Buffer> {
  const response = await fetch(member.user.displayAvatarURL({ extension: 'png', size: 512 }));
  if (!response.ok) throw new Error('Avatar konnte nicht geladen werden.');
  return Buffer.from(await response.arrayBuffer());
}

export async function renderWelcomeImage(member: GuildMember): Promise<Buffer> {
  const config = getConfig().welcome.dynamicImage;
  const width = config.width;
  const height = config.height;
  const backgroundPath = getAssetAbsolutePath(config.backgroundAssetId);

  let base = backgroundPath
    ? sharp(backgroundPath).resize(width, height, { fit: 'cover' })
    : sharp({
        create: { width, height, channels: 4, background: '#202225' }
      });

  const composites: sharp.OverlayOptions[] = [];

  if (config.avatar.enabled) {
    const size = Math.min(config.avatar.size, width, height);
    let avatar = sharp(await avatarBuffer(member)).resize(size, size, { fit: 'cover' });
    if (config.avatar.circle) {
      const mask = Buffer.from(
        `<svg width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="white"/></svg>`
      );
      avatar = avatar.composite([{ input: mask, blend: 'dest-in' }]);
    }
    composites.push({
      input: await avatar.png().toBuffer(),
      left: Math.min(config.avatar.x, Math.max(0, width - size)),
      top: Math.min(config.avatar.y, Math.max(0, height - size))
    });
  }

  const values = {
    username: member.user.displayName,
    mention: `@${member.user.username}`,
    server: member.guild.name,
    memberCount: member.guild.memberCount
  };

  const textLayers = [config.usernameText, config.memberText].filter((layer) => layer.enabled);
  for (const layer of textLayers) {
    const text = escapeXml(renderTemplate(layer.template, values));
    const svg = Buffer.from(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <text x="${Math.min(layer.x, width)}"
              y="${Math.min(layer.y, height)}"
              font-family="${escapeXml(layer.fontFamily)}"
              font-size="${layer.fontSize}"
              font-weight="700"
              fill="${layer.color}">${text}</text>
      </svg>
    `);
    composites.push({ input: svg, left: 0, top: 0 });
  }

  return base.composite(composites).png().toBuffer();
}
