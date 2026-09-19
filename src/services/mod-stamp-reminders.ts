import type { Client } from 'discord.js';
import { getConfig } from '../config/store.js';
import { db } from '../core/database.js';
import { log } from '../core/logger.js';

let timer: NodeJS.Timeout | null = null;

type Stamp = {
  id: string;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  title: string;
  start_at: string;
  status: string;
};

async function tick(client: Client): Promise<void> {
  const cfg = getConfig().modStamp;
  if (!cfg.reminderMinutes.length) return;

  const stamps = db.prepare("SELECT * FROM mod_stamps WHERE status='open'").all() as Stamp[];
  const now = Date.now();

  for (const stamp of stamps) {
    const start = new Date(stamp.start_at).getTime();
    if (!Number.isFinite(start) || start <= now) continue;

    for (const minutes of cfg.reminderMinutes) {
      const remaining = start - now;
      if (remaining > minutes * 60_000 || remaining <= (minutes - 1) * 60_000) continue;

      const exists = db.prepare(
        'SELECT 1 FROM mod_stamp_reminders WHERE stamp_id=? AND minutes=?'
      ).get(stamp.id, minutes);
      if (exists) continue;

      const guild = client.guilds.cache.get(stamp.guild_id);
      const channel = guild ? await guild.channels.fetch(stamp.channel_id).catch(() => null) : null;
      if (!channel?.isTextBased() || !('send' in channel)) continue;

      const mentions = cfg.voteRoleIds.map((roleId) => `<@&${roleId}>`).join(' ');
      await channel.send(
        `⏰ ${mentions ? mentions + ' ' : ''}**${stamp.title}** beginnt in **${minutes} Minuten**.`
      );

      db.prepare(
        'INSERT INTO mod_stamp_reminders(stamp_id,minutes,sent_at) VALUES(?,?,?)'
      ).run(stamp.id, minutes, new Date().toISOString());
    }
  }
}

export function startModStampReminders(client: Client): void {
  stopModStampReminders();
  void tick(client).catch((error) => log.warn('Mod-Stempel-Erinnerung fehlgeschlagen.', String(error)));
  timer = setInterval(() => {
    void tick(client).catch((error) => log.warn('Mod-Stempel-Erinnerung fehlgeschlagen.', String(error)));
  }, 30_000);
}

export function stopModStampReminders(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
