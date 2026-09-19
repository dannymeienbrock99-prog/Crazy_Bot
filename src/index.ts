import { validateRuntimeSecurity } from './env.js';
import { log } from './core/logger.js';
import './core/database.js';
import { startDiscordBot, stopDiscordBot } from './discord/client.js';
import { startWebServer } from './web/server.js';
import { startBackupScheduler, stopBackupScheduler } from './services/backup-scheduler.js';

validateRuntimeSecurity();

const client = await startDiscordBot();
startWebServer(client);
startBackupScheduler();

async function shutdown(signal: string): Promise<void> {
  log.info('Shutdown angefordert.', { signal });
  stopBackupScheduler();
  await stopDiscordBot();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  log.error('Unbehandelte Promise-Ablehnung.', reason);
});

process.on('uncaughtException', (error) => {
  log.error('Unbehandelte Exception.', error.stack ?? error.message);
});
