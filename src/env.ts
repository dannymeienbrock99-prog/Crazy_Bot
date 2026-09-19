import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

export const configRoot = path.resolve(
  process.env.CRAZY_BOT_CONFIG_DIR?.trim() || process.cwd()
);
export const envFilePath = path.join(configRoot, '.env');

if (fs.existsSync(envFilePath)) {
  dotenv.config({ path: envFilePath });
}

function readNumber(name: string, fallback: number): number {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resolveDataDir(): string {
  const configured = process.env.DATA_DIR?.trim();
  if (!configured) return path.join(configRoot, 'data');
  return path.isAbsolute(configured)
    ? configured
    : path.resolve(configRoot, configured);
}

export const env = {
  discordToken: process.env.DISCORD_TOKEN?.trim() ?? '',
  discordClientId: process.env.DISCORD_CLIENT_ID?.trim() ?? '',
  discordGuildId: process.env.DISCORD_GUILD_ID?.trim() ?? '',
  dashboardHost: process.env.DASHBOARD_HOST?.trim() || '127.0.0.1',
  dashboardPort: readNumber('DASHBOARD_PORT', 3210),
  dashboardAccessKey: process.env.DASHBOARD_ACCESS_KEY?.trim() ?? '',
  dataDir: resolveDataDir(),
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
