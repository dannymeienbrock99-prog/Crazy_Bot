import 'dotenv/config';
import path from 'node:path';

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const env = {
  discordToken: process.env.DISCORD_TOKEN?.trim() ?? '',
  discordClientId: process.env.DISCORD_CLIENT_ID?.trim() ?? '',
  discordGuildId: process.env.DISCORD_GUILD_ID?.trim() ?? '',
  dashboardHost: process.env.DASHBOARD_HOST?.trim() || '127.0.0.1',
  dashboardPort: readNumber('DASHBOARD_PORT', 3210),
  dashboardAccessKey: process.env.DASHBOARD_ACCESS_KEY?.trim() ?? '',
  dataDir: path.resolve(process.env.DATA_DIR?.trim() || './data'),
  logLevel: process.env.LOG_LEVEL?.trim() || 'info'
};

export function validateRuntimeSecurity(): void {
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1']);
  if (!localHosts.has(env.dashboardHost) && !env.dashboardAccessKey) {
    throw new Error(
      'DASHBOARD_ACCESS_KEY muss gesetzt sein, wenn das Dashboard im Netzwerk erreichbar ist.'
    );
  }
}
