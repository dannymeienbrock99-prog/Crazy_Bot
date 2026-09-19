import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { db } from '../core/database.js';
import { env } from '../env.js';

export type AssetRecord = {
  id: string;
  kind: string;
  name: string;
  mime: string;
  path: string;
  created_at: string;
};

function extensionForMime(mime: string): string {
  const map: Record<string, string> = {
    'image/png': '.png',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg'
  };
  return map[mime] || '';
}

export function saveAsset(kind: string, originalName: string, mime: string, buffer: Buffer): AssetRecord {
  if (!mime.startsWith('image/')) throw new Error('Nur Bilddateien sind erlaubt.');
  const id = crypto.randomUUID();
  const filename = id + extensionForMime(mime);
  const relative = path.join('assets', filename);
  const absolute = path.join(env.dataDir, relative);
  fs.writeFileSync(absolute, buffer);

  const record: AssetRecord = {
    id,
    kind,
    name: originalName,
    mime,
    path: relative.replaceAll('\\', '/'),
    created_at: new Date().toISOString()
  };

  db.prepare(
    'INSERT INTO assets(id, kind, name, mime, path, created_at) VALUES(?, ?, ?, ?, ?, ?)'
  ).run(record.id, record.kind, record.name, record.mime, record.path, record.created_at);

  return record;
}

export function getAsset(id: string | null | undefined): AssetRecord | null {
  if (!id) return null;
  return (db.prepare('SELECT * FROM assets WHERE id = ?').get(id) as AssetRecord | undefined) ?? null;
}

export function getAssetAbsolutePath(id: string | null | undefined): string | null {
  const asset = getAsset(id);
  return asset ? path.join(env.dataDir, asset.path) : null;
}

export function listAssets(kind?: string): AssetRecord[] {
  if (kind) {
    return db.prepare('SELECT * FROM assets WHERE kind = ? ORDER BY created_at DESC').all(kind) as AssetRecord[];
  }
  return db.prepare('SELECT * FROM assets ORDER BY created_at DESC').all() as AssetRecord[];
}
