import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import multer from 'multer';
import type { Client, Guild } from 'discord.js';
import { env } from '../env.js';
import { getConfig, saveConfig } from '../config/store.js';
import { listAssets, saveAsset, getAssetAbsolutePath, getAsset } from '../assets/store.js';
import { db, audit } from '../core/database.js';
import { log } from '../core/logger.js';
import { publishRules } from '../modules/rules.js';
import { publishRolePanel } from '../modules/roles.js';
import { publishStreamPlan } from '../modules/stream-plan.js';
import { buildEmbed } from '../discord/embed.js';
import { createBackupBuffer, restoreBackupBuffer } from '../services/backup.js';

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a);
  const bb = Buffer.from(b);
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

function auth(req: Request, res: Response, next: NextFunction): void {
  if (!env.dashboardAccessKey) return next();
  const header = req.header('authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !safeEqual(token, env.dashboardAccessKey)) {
    res.status(401).json({ error: 'Nicht autorisiert.' });
    return;
  }
  next();
}

function pickGuild(client: Client | null, requested?: string): Guild | null {
  if (!client?.isReady()) return null;
  if (requested) return client.guilds.cache.get(requested) ?? null;
  if (env.discordGuildId) return client.guilds.cache.get(env.discordGuildId) ?? null;
  return client.guilds.cache.first() ?? null;
}

export function startWebServer(client: Client | null): void {
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024, files: 1 }
  });
  const backupUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 150 * 1024 * 1024, files: 1 }
  });

  app.disable('x-powered-by');
  app.use(express.json({ limit: '2mb' }));

  app.get('/media/:id', (req, res) => {
    const asset = getAsset(req.params.id);
    const absolute = getAssetAbsolutePath(req.params.id);
    if (!asset || !absolute || !fs.existsSync(absolute)) {
      res.sendStatus(404);
      return;
    }
    res.type(asset.mime).sendFile(absolute);
  });

  app.use('/api', auth);

  app.get('/api/status', (_req, res) => {
    const cfg = getConfig();
    res.json({
      ok: true,
      discord: client?.isReady() ?? false,
      botUser: client?.user?.tag ?? null,
      guilds: client?.guilds.cache.size ?? 0,
      dashboard: { host: env.dashboardHost, port: env.dashboardPort },
      modules: {
        welcome: cfg.welcome.enabled,
        rules: cfg.rules.enabled,
        tiktokLive: cfg.tiktokLive.enabled,
        streamPlan: cfg.streamPlan.enabled,
        serverStats: cfg.serverStats.enabled,
        hangman: cfg.hangman.enabled
      }
    });
  });

  app.get('/api/config', (_req, res) => res.json(getConfig()));
  app.put('/api/config', (req, res) => {
    try {
      const config = saveConfig(req.body);
      audit('dashboard', 'config.save', { version: config.version });
      res.json(config);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/assets', (req, res) => {
    res.json(listAssets(typeof req.query.kind === 'string' ? req.query.kind : undefined));
  });

  app.post('/api/assets', upload.single('file'), (req, res) => {
    try {
      if (!req.file) throw new Error('Keine Datei empfangen.');
      const kind = typeof req.body.kind === 'string' ? req.body.kind : 'general';
      const asset = saveAsset(kind, req.file.originalname, req.file.mimetype, req.file.buffer);
      audit('dashboard', 'asset.upload', { id: asset.id, kind, name: asset.name });
      res.status(201).json(asset);
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/discord/context', async (req, res) => {
    const guild = pickGuild(client, typeof req.query.guildId === 'string' ? req.query.guildId : undefined);
    if (!guild) {
      res.json({ online: false, guild: null, channels: [], roles: [] });
      return;
    }

    await guild.channels.fetch();
    await guild.roles.fetch();

    res.json({
      online: true,
      guild: { id: guild.id, name: guild.name, memberCount: guild.memberCount },
      channels: guild.channels.cache
        .filter(Boolean)
        .map((channel) => ({
          id: channel!.id,
          name: channel!.name,
          type: channel!.type,
          textBased: channel!.isTextBased()
        }))
        .sort((a, b) => a.name.localeCompare(b.name, 'de')),
      roles: guild.roles.cache
        .filter((role) => role.id !== guild.id)
        .map((role) => ({ id: role.id, name: role.name, color: role.hexColor, position: role.position }))
        .sort((a, b) => b.position - a.position)
    });
  });

  app.post('/api/discord/identity/sync', async (req, res) => {
    try {
      if (!client?.isReady() || !client.user) throw new Error('Discord ist nicht verbunden.');
      const cfg = getConfig();

      if (cfg.branding.botDisplayName && client.user.username !== cfg.branding.botDisplayName) {
        await client.user.setUsername(cfg.branding.botDisplayName);
      }

      const avatarPath = getAssetAbsolutePath(cfg.branding.avatarAssetId);
      if (avatarPath) await client.user.setAvatar(fs.readFileSync(avatarPath));

      for (const guild of client.guilds.cache.values()) {
        const me = await guild.members.fetchMe();
        if (cfg.branding.serverNickname) {
          await me.setNickname(cfg.branding.serverNickname, 'Bot-Identität aus Dashboard').catch(() => undefined);
        }
      }

      audit('dashboard', 'discord.identity.sync', { name: cfg.branding.botDisplayName });
      res.json({ ok: true, username: client.user.username });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/rules/publish', async (req, res) => {
    try {
      const guild = pickGuild(client, req.body?.guildId);
      if (!guild) throw new Error('Discord-Server nicht verfügbar.');
      const messageId = await publishRules(guild);
      audit('dashboard', 'rules.publish', { guildId: guild.id, messageId });
      res.json({ ok: true, messageId });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/roles/:panelId/publish', async (req, res) => {
    try {
      const guild = pickGuild(client, req.body?.guildId);
      if (!guild) throw new Error('Discord-Server nicht verfügbar.');
      const messageId = await publishRolePanel(guild, req.params.panelId);
      audit('dashboard', 'roles.publish', { guildId: guild.id, panelId: req.params.panelId, messageId });
      res.json({ ok: true, messageId });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/stream-plan/publish', async (req, res) => {
    try {
      const guild = pickGuild(client, req.body?.guildId);
      if (!guild) throw new Error('Discord-Server nicht verfügbar.');
      const messageId = await publishStreamPlan(guild);
      audit('dashboard', 'stream-plan.publish', { guildId: guild.id, messageId });
      res.json({ ok: true, messageId });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/tiktok/test', async (req, res) => {
    try {
      const guild = pickGuild(client, req.body?.guildId);
      const cfg = getConfig().tiktokLive;
      if (!guild || !cfg.channelId) throw new Error('TikTok-Live-Kanal nicht verfügbar.');
      const channel = await guild.channels.fetch(cfg.channelId);
      if (!channel?.isTextBased() || !('send' in channel)) throw new Error('Ungültiger Kanal.');
      await channel.send({
        content: '🔴 Test der TikTok-Live-Benachrichtigung',
        embeds: cfg.embed.enabled ? [buildEmbed(cfg.embed).setDescription('So sieht die Live-Benachrichtigung aus.')] : []
      });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/backup/export', (_req, res) => {
    try {
      const data = createBackupBuffer();
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="Crazy_Bot_${stamp}.koribackup"`);
      res.send(data);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post('/api/backup/import', backupUpload.single('file'), (req, res) => {
    try {
      if (!req.file) throw new Error('Keine Backup-Datei empfangen.');
      restoreBackupBuffer(req.file.buffer);
      audit('dashboard', 'backup.import', { name: req.file.originalname, bytes: req.file.size });
      res.json({ ok: true });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.get('/api/audit', (_req, res) => {
    const rows = db.prepare('SELECT * FROM audit_log ORDER BY id DESC LIMIT 100').all();
    res.json(rows);
  });

  const webRoot = path.resolve('web');
  app.use(express.static(webRoot));
  app.get('*path', (_req, res) => res.sendFile(path.join(webRoot, 'index.html')));

  app.listen(env.dashboardPort, env.dashboardHost, () => {
    log.info('Dashboard gestartet.', {
      url: `http://${env.dashboardHost}:${env.dashboardPort}`,
      protected: Boolean(env.dashboardAccessKey)
    });
  });
}
