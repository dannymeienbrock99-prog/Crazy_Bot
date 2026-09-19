import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import { env } from '../env.js';

fs.mkdirSync(env.dataDir, { recursive: true });
fs.mkdirSync(path.join(env.dataDir, 'assets'), { recursive: true });
fs.mkdirSync(path.join(env.dataDir, 'backups'), { recursive: true });

export const db = new Database(path.join(env.dataDir, 'crazy-bot.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('busy_timeout = 5000');

db.exec(`
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  name TEXT NOT NULL,
  mime TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mod_stamps (
  id TEXT PRIMARY KEY,
  guild_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  message_id TEXT,
  title TEXT NOT NULL,
  start_at TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS mod_stamp_votes (
  stamp_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  response TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (stamp_id, user_id),
  FOREIGN KEY (stamp_id) REFERENCES mod_stamps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mod_stamp_reminders (
  stamp_id TEXT NOT NULL,
  minutes INTEGER NOT NULL,
  sent_at TEXT NOT NULL,
  PRIMARY KEY (stamp_id, minutes),
  FOREIGN KEY (stamp_id) REFERENCES mod_stamps(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS hangman_games (
  guild_id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  word TEXT NOT NULL,
  category TEXT NOT NULL,
  guessed TEXT NOT NULL,
  wrong TEXT NOT NULL,
  started_by TEXT NOT NULL,
  status TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);
`);

export function audit(actor: string, action: string, details: unknown = {}): void {
  db.prepare(
    'INSERT INTO audit_log(actor, action, details, created_at) VALUES(?, ?, ?, ?)'
  ).run(actor, action, JSON.stringify(details), new Date().toISOString());
}
