import type { Client, Guild } from 'discord.js';
import { getConfig } from '../config/store.js';
import { log } from '../core/logger.js';

let timer: NodeJS.Timeout | null = null;

async function valueFor(guild: Guild, type: 'members' | 'bots' | 'boosts' | 'voice'): Promise<number> {
  if (type === 'members') return guild.memberCount;
  if (type === 'boosts') return guild.premiumSubscriptionCount ?? 0;
  if (type === 'voice') return guild.voiceStates.cache.filter((state) => Boolean(state.channelId)).size;

  const members = await guild.members.fetch();
  return members.filter((member) => member.user.bot).size;
}

async function update(client: Client): Promise<void> {
  const cfg = getConfig().serverStats;
  if (!cfg.enabled) return;

  for (const guild of client.guilds.cache.values()) {
    for (const stat of cfg.stats) {
      if (!stat.channelId) continue;
      const channel = await guild.channels.fetch(stat.channelId).catch(() => null);
      if (!channel) continue;
      const value = await valueFor(guild, stat.type);
      const name = stat.template.replace('{value}', String(value)).slice(0, 100);
      if (channel.name !== name) await channel.setName(name, 'Automatische Server-Statistik').catch(() => undefined);
    }
  }
}

export function startServerStats(client: Client): void {
  if (timer) clearInterval(timer);
  const seconds = getConfig().serverStats.intervalSeconds;
  void update(client).catch((error) => log.warn('Server-Stats Update fehlgeschlagen.', String(error)));
  timer = setInterval(() => {
    void update(client).catch((error) => log.warn('Server-Stats Update fehlgeschlagen.', String(error)));
  }, seconds * 1000);
}

export function stopServerStats(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
