import { db } from '../core/database.js';
import { appConfigSchema, defaultConfig, type AppConfig } from './schema.js';

const CONFIG_KEY = 'app-config';

function deepMerge<T>(base: T, patch: unknown): T {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) return base;
  const output: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  for (const [key, value] of Object.entries(patch as Record<string, unknown>)) {
    const current = output[key];
    if (
      current &&
      typeof current === 'object' &&
      !Array.isArray(current) &&
      value &&
      typeof value === 'object' &&
      !Array.isArray(value)
    ) {
      output[key] = deepMerge(current, value);
    } else {
      output[key] = value;
    }
  }
  return output as T;
}

export function getConfig(): AppConfig {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(CONFIG_KEY) as
    | { value: string }
    | undefined;

  if (!row) return defaultConfig;

  try {
    const saved = JSON.parse(row.value);
    return appConfigSchema.parse(deepMerge(defaultConfig, saved));
  } catch {
    return defaultConfig;
  }
}

export function saveConfig(input: unknown): AppConfig {
  const config = appConfigSchema.parse(input);
  db.prepare(`
    INSERT INTO settings(key, value, updated_at)
    VALUES(?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
  `).run(CONFIG_KEY, JSON.stringify(config), new Date().toISOString());
  return config;
}

export function updateConfig(mutator: (config: AppConfig) => AppConfig): AppConfig {
  const next = mutator(structuredClone(getConfig()));
  return saveConfig(next);
}
