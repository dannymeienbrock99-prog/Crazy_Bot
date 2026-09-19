import { getConfig } from '../config/store.js';
import { log } from '../core/logger.js';
import { pruneAutomaticBackups, saveAutomaticBackup } from './backup.js';

let timer: NodeJS.Timeout | null = null;

function run(): void {
  const cfg = getConfig().backup;
  if (!cfg.automaticEnabled) return;
  try {
    const file = saveAutomaticBackup();
    pruneAutomaticBackups(cfg.keepFiles);
    log.info('Automatisches Backup erstellt.', { file });
  } catch (error) {
    log.error('Automatisches Backup fehlgeschlagen.', String(error));
  }
}

export function startBackupScheduler(): void {
  stopBackupScheduler();
  const cfg = getConfig().backup;
  if (!cfg.automaticEnabled) return;
  timer = setInterval(run, cfg.intervalHours * 60 * 60 * 1000);
}

export function stopBackupScheduler(): void {
  if (timer) clearInterval(timer);
  timer = null;
}
