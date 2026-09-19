import { TikTokLiveConnection, WebcastEvent } from 'tiktok-live-connector';
import type { Client } from 'discord.js';
import { getConfig } from '../config/store.js';
import { buildEmbed } from '../discord/embed.js';
import { renderTemplate } from '../utils/template.js';
import { log } from '../core/logger.js';

let connection: TikTokLiveConnection | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let announcedRoomId = '';

function schedule(client: Client): void {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  const seconds = getConfig().tiktokLive.reconnectSeconds;
  reconnectTimer = setTimeout(() => void connect(client), seconds * 1000);
}

async function notify(client: Client, roomId: string): Promise<void> {
  const cfg = getConfig().tiktokLive;
  if (announcedRoomId === roomId) return;
  announcedRoomId = roomId;

  const mention =
    cfg.mentionMode === 'everyone'
      ? '@everyone'
      : cfg.mentionMode === 'role' && cfg.mentionRoleId
        ? `<@&${cfg.mentionRoleId}>`
        : '';

  const url = `https://www.tiktok.com/@${cfg.uniqueId.replace(/^@/, '')}/live`;
  const values = { mention, creator: cfg.uniqueId, url };

  for (const guild of client.guilds.cache.values()) {
    const channel = await guild.channels.fetch(cfg.channelId).catch(() => null);
    if (!channel?.isTextBased() || !('send' in channel)) continue;
    const embed = buildEmbed({
      ...cfg.embed,
      title: renderTemplate(cfg.embed.title, values),
      description: renderTemplate(cfg.embed.description, values)
    }).setURL(url);

    await channel.send({
      content: renderTemplate(cfg.content, values),
      embeds: cfg.embed.enabled ? [embed] : []
    });
  }
}

async function connect(client: Client): Promise<void> {
  const cfg = getConfig().tiktokLive;
  if (!cfg.enabled || !cfg.uniqueId || !cfg.channelId) return;

  try {
    if (connection) {
      await connection.disconnect().catch(() => undefined);
      connection = null;
    }

    connection = new TikTokLiveConnection(cfg.uniqueId);
    connection.on(WebcastEvent.STREAM_END, () => {
      announcedRoomId = '';
      schedule(client);
    });
    connection.on('disconnected', () => schedule(client));

    const state = await connection.connect();
    await notify(client, String(state.roomId));
    log.info('TikTok LIVE verbunden.', { roomId: String(state.roomId), creator: cfg.uniqueId });
  } catch (error) {
    log.debug('TikTok ist nicht live oder Verbindung derzeit nicht möglich.', String(error));
    schedule(client);
  }
}

export function startTikTokLive(client: Client): void {
  void connect(client);
}

export async function stopTikTokLive(): Promise<void> {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  if (connection) await connection.disconnect().catch(() => undefined);
  connection = null;
}
