import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { appConfigSchema } from '../config/schema.js';
import { getConfig, saveConfig } from '../config/store.js';
import { db } from '../core/database.js';
import { env } from '../env.js';

type BackupAsset = {
  id: string;
  kind: string;
  name: string;
  mime: string;
  createdAt: string;
  filename: string;
  dataBase64: string;
};

type BackupPayload = {
  format: 'crazy-bot-backup';
  version: 1;
  createdAt: string;
  config: unknown;
  assets: BackupAsset[];
  state: {
    modStamps: Record<string, unknown>[];
    modStampVotes: Record<string, unknown>[];
    modStampReminders: Record<string, unknown>[];
    hangmanGames: Record<string, unknown>[];
  };
};

function backupRows(table: string): Record<string, unknown>[] {
  return db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
}

export function createBackupBuffer(): Buffer {
  const rows = db.prepare('SELECT * FROM assets ORDER BY created_at').all() as {
    id: string; kind: string; name: string; mime: string; path: string; created_at: string;
  }[];

  const assets: BackupAsset[] = [];
  for (const row of rows) {
    const absolute = path.join(env.dataDir, row.path);
    if (!fs.existsSync(absolute)) continue;
    assets.push({
      id: row.id,
      kind: row.kind,
      name: row.name,
      mime: row.mime,
      createdAt: row.created_at,
      filename: path.basename(row.path),
      dataBase64: fs.readFileSync(absolute).toString('base64')
    });
  }

  const payload: BackupPayload = {
    format: 'crazy-bot-backup',
    version: 1,
    createdAt: new Date().toISOString(),
    config: getConfig(),
    assets,
    state: {
      modStamps: backupRows('mod_stamps'),
      modStampVotes: backupRows('mod_stamp_votes'),
      modStampReminders: backupRows('mod_stamp_reminders'),
      hangmanGames: backupRows('hangman_games')
    }
  };

  return Buffer.from(JSON.stringify(payload), 'utf8');
}

function assertRowObject(value: unknown, table: string): Record<string, unknown>[] {
  if (!Array.isArray(value) || value.some((item) => !item || typeof item !== 'object' || Array.isArray(item))) {
    throw new Error(`Ungültige Backup-Tabelle: ${table}`);
  }
  return value as Record<string, unknown>[];
}

export function restoreBackupBuffer(buffer: Buffer): void {
  if (buffer.length > 150 * 1024 * 1024) throw new Error('Backup ist größer als 150 MB.');

  let parsed: BackupPayload;
  try {
    parsed = JSON.parse(buffer.toString('utf8')) as BackupPayload;
  } catch {
    throw new Error('Backup-Datei ist kein gültiges Crazy_Bot-Backup.');
  }

  if (parsed.format !== 'crazy-bot-backup' || parsed.version !== 1) {
    throw new Error('Backup-Format oder Version wird nicht unterstützt.');
  }

  const validatedConfig = appConfigSchema.parse(parsed.config);
  if (!Array.isArray(parsed.assets)) throw new Error('Backup enthält keine gültige Medienliste.');

  const modStamps = assertRowObject(parsed.state?.modStamps, 'mod_stamps');
  const modStampVotes = assertRowObject(parsed.state?.modStampVotes, 'mod_stamp_votes');
  const modStampReminders = assertRowObject(parsed.state?.modStampReminders ?? [], 'mod_stamp_reminders');
  const hangmanGames = assertRowObject(parsed.state?.hangmanGames, 'hangman_games');

  const staging = path.join(env.dataDir, `.restore-${crypto.randomUUID()}`);
  fs.mkdirSync(staging, { recursive: true });

  try {
    for (const asset of parsed.assets) {
      if (!asset?.id || !asset.filename || !asset.mime?.startsWith('image/') || typeof asset.dataBase64 !== 'string') {
        throw new Error('Backup enthält einen ungültigen Medien-Eintrag.');
      }
      const safeName = path.basename(asset.filename);
      fs.writeFileSync(path.join(staging, safeName), Buffer.from(asset.dataBase64, 'base64'));
    }

    const restore = db.transaction(() => {
      db.prepare('DELETE FROM mod_stamp_reminders').run();
      db.prepare('DELETE FROM mod_stamp_votes').run();
      db.prepare('DELETE FROM mod_stamps').run();
      db.prepare('DELETE FROM hangman_games').run();
      db.prepare('DELETE FROM assets').run();

      const assetInsert = db.prepare(
        'INSERT INTO assets(id, kind, name, mime, path, created_at) VALUES(?, ?, ?, ?, ?, ?)'
      );
      for (const asset of parsed.assets) {
        assetInsert.run(
          asset.id,
          asset.kind,
          asset.name,
          asset.mime,
          path.join('assets', path.basename(asset.filename)).replaceAll('\\', '/'),
          asset.createdAt
        );
      }

      const stampInsert = db.prepare(
        'INSERT INTO mod_stamps(id, guild_id, channel_id, message_id, title, start_at, description, created_by, status, created_at) VALUES(@id,@guild_id,@channel_id,@message_id,@title,@start_at,@description,@created_by,@status,@created_at)'
      );
      for (const row of modStamps) stampInsert.run(row);

      const voteInsert = db.prepare(
        'INSERT INTO mod_stamp_votes(stamp_id,user_id,response,updated_at) VALUES(@stamp_id,@user_id,@response,@updated_at)'
      );
      for (const row of modStampVotes) voteInsert.run(row);

      const reminderInsert = db.prepare(
        'INSERT INTO mod_stamp_reminders(stamp_id,minutes,sent_at) VALUES(@stamp_id,@minutes,@sent_at)'
      );
      for (const row of modStampReminders) reminderInsert.run(row);

      const hangmanInsert = db.prepare(
        'INSERT INTO hangman_games(guild_id,channel_id,word,category,guessed,wrong,started_by,status,updated_at) VALUES(@guild_id,@channel_id,@word,@category,@guessed,@wrong,@started_by,@status,@updated_at)'
      );
      for (const row of hangmanGames) hangmanInsert.run(row);

      saveConfig(validatedConfig);
    });

    restore();

    const assetsDir = path.join(env.dataDir, 'assets');
    fs.mkdirSync(assetsDir, { recursive: true });
    for (const existing of fs.readdirSync(assetsDir)) {
      const absolute = path.join(assetsDir, existing);
      if (fs.statSync(absolute).isFile()) fs.unlinkSync(absolute);
    }
    for (const filename of fs.readdirSync(staging)) {
      fs.copyFileSync(path.join(staging, filename), path.join(assetsDir, filename));
    }
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
}

export function saveAutomaticBackup(): string {
  const dir = path.join(env.dataDir, 'backups');
  fs.mkdirSync(dir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const file = path.join(dir, `Crazy_Bot_${stamp}.koribackup`);
  fs.writeFileSync(file, createBackupBuffer());
  return file;
}

export function pruneAutomaticBackups(keep: number): void {
  const dir = path.join(env.dataDir, 'backups');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir)
    .filter((name) => name.endsWith('.koribackup'))
    .map((name) => ({ name, time: fs.statSync(path.join(dir, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (const old of files.slice(Math.max(1, keep))) {
    fs.unlinkSync(path.join(dir, old.name));
  }
}
