import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const embedSchema = z.object({
  enabled: z.boolean().default(true),
  title: z.string().max(256).default(''),
  description: z.string().max(4096).default(''),
  author: z.string().max(256).default(''),
  footer: z.string().max(2048).default(''),
  imageAssetId: z.string().nullable().default(null),
  thumbnailAssetId: z.string().nullable().default(null),
  color: hexColor.default('#FFFFFF')
});

const textLayerSchema = z.object({
  enabled: z.boolean().default(true),
  x: z.number().int().min(0).default(360),
  y: z.number().int().min(0).default(180),
  fontSize: z.number().int().min(8).max(300).default(46),
  fontFamily: z.string().max(100).default('Arial'),
  color: hexColor.default('#FFFFFF'),
  template: z.string().max(500).default('{username}')
});

const rolePanelEntrySchema = z.object({
  roleId: z.string(),
  label: z.string().max(80),
  emoji: z.string().max(80).default(''),
  style: z.enum(['primary', 'secondary', 'success', 'danger']).default('secondary')
});

const rolePanelSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  channelId: z.string(),
  messageId: z.string().default(''),
  title: z.string().max(256).default('Rollen auswählen'),
  description: z.string().max(2000).default(''),
  entries: z.array(rolePanelEntrySchema).max(25).default([])
});

const streamEntrySchema = z.object({
  id: z.string(),
  day: z.enum(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  title: z.string().max(120),
  platform: z.string().max(80).default('TikTok'),
  note: z.string().max(300).default('')
});

const serverStatSchema = z.object({
  id: z.string(),
  type: z.enum(['members', 'bots', 'boosts', 'voice']),
  channelId: z.string().default(''),
  template: z.string().max(100)
});

export const appConfigSchema = z.object({
  version: z.literal(1).default(1),
  general: z.object({
    language: z.literal('de-DE').default('de-DE'),
    timezone: z.string().default('Europe/Berlin')
  }).default({ language: 'de-DE', timezone: 'Europe/Berlin' }),

  branding: z.object({
    botDisplayName: z.string().min(1).max(32).default('Kori'),
    serverNickname: z.string().max(32).default('Kori'),
    dashboardTitle: z.string().min(1).max(80).default('Kori'),
    avatarAssetId: z.string().nullable().default(null),
    dashboardLogoAssetId: z.string().nullable().default(null),
    faviconAssetId: z.string().nullable().default(null),
    embedAccentColor: hexColor.default('#FFFFFF'),
    lockEmbedAccentWhite: z.boolean().default(true)
  }).default({}),

  welcome: z.object({
    enabled: z.boolean().default(false),
    channelId: z.string().default(''),
    content: z.string().max(2000).default('Willkommen {mention} auf **{server}**!'),
    embed: embedSchema.default({ title: 'Willkommen!', description: 'Schön, dass du da bist.' }),
    dynamicImage: z.object({
      enabled: z.boolean().default(true),
      width: z.number().int().min(320).max(4096).default(1200),
      height: z.number().int().min(180).max(4096).default(500),
      backgroundAssetId: z.string().nullable().default(null),
      avatar: z.object({
        enabled: z.boolean().default(true),
        x: z.number().int().min(0).default(90),
        y: z.number().int().min(0).default(110),
        size: z.number().int().min(32).max(1200).default(280),
        circle: z.boolean().default(true)
      }).default({}),
      usernameText: textLayerSchema.default({ template: '{username}' }),
      memberText: textLayerSchema.default({
        x: 360,
        y: 245,
        fontSize: 30,
        color: '#D7D7D7',
        template: 'Mitglied #{memberCount}'
      })
    }).default({}),
    log: z.object({
      channelId: z.string().default(''),
      joinEnabled: z.boolean().default(true),
      leaveEnabled: z.boolean().default(true),
      joinText: z.string().max(2000).default('➕ {user} ist dem Server beigetreten.'),
      leaveText: z.string().max(2000).default('➖ {username} hat den Server verlassen.')
    }).default({})
  }).default({}),

  roles: z.object({
    autoRoleIds: z.array(z.string()).max(25).default([]),
    delayMs: z.number().int().min(0).max(300000).default(0),
    ignoreBots: z.boolean().default(true),
    panels: z.array(rolePanelSchema).max(20).default([])
  }).default({}),

  rules: z.object({
    enabled: z.boolean().default(false),
    channelId: z.string().default(''),
    messageId: z.string().default(''),
    content: z.string().max(2000).default(''),
    embed: embedSchema.default({
      title: '• ───・9・SERVER-REGELN・9・─── •',
      description: 'Die Regeln gelten für alle auf diesem Server.',
      color: '#FFFFFF'
    }),
    acceptance: z.object({
      enabled: z.boolean().default(false),
      roleId: z.string().default(''),
      buttonLabel: z.string().max(80).default('Regeln akzeptieren'),
      buttonEmoji: z.string().max(80).default('✅')
    }).default({})
  }).default({}),

  tiktokLive: z.object({
    enabled: z.boolean().default(false),
    uniqueId: z.string().default(''),
    channelId: z.string().default(''),
    mentionMode: z.enum(['everyone', 'role', 'none']).default('everyone'),
    mentionRoleId: z.string().default(''),
    content: z.string().max(2000).default('{mention} 🔴 **{creator} ist jetzt auf TikTok LIVE!**'),
    reconnectSeconds: z.number().int().min(30).max(1800).default(60),
    embed: embedSchema.default({
      title: '🔴 Jetzt LIVE auf TikTok',
      description: 'Komm in den Stream!',
      color: '#FFFFFF'
    })
  }).default({}),

  modStamp: z.object({
    allowedRoleIds: z.array(z.string()).max(25).default([]),
    voteRoleIds: z.array(z.string()).max(25).default([]),
    reminderMinutes: z.array(z.number().int().min(1).max(10080)).max(10).default([60, 15]),
    embed: embedSchema.default({
      title: '🛡️ Mod-Stempel',
      description: 'Bitte Teilnahme auswählen.',
      color: '#FFFFFF'
    })
  }).default({}),

  streamPlan: z.object({
    enabled: z.boolean().default(false),
    channelId: z.string().default(''),
    messageId: z.string().default(''),
    entries: z.array(streamEntrySchema).max(50).default([]),
    embed: embedSchema.default({
      title: '📅 Streamplan',
      description: 'Unser aktueller Streamplan',
      color: '#FFFFFF'
    })
  }).default({}),

  serverStats: z.object({
    enabled: z.boolean().default(false),
    intervalSeconds: z.number().int().min(60).max(3600).default(300),
    stats: z.array(serverStatSchema).max(10).default([
      { id: 'members', type: 'members', channelId: '', template: '👥 Mitglieder: {value}' },
      { id: 'boosts', type: 'boosts', channelId: '', template: '💎 Boosts: {value}' },
      { id: 'voice', type: 'voice', channelId: '', template: '🔊 Im Voice: {value}' }
    ])
  }).default({}),

  hangman: z.object({
    enabled: z.boolean().default(false),
    channelId: z.string().default(''),
    maxWrong: z.number().int().min(3).max(12).default(7),
    allowSameUser: z.boolean().default(true),
    words: z.record(z.string(), z.array(z.string().min(2).max(60))).default({
      Allgemein: ['discord', 'stream', 'community', 'gaming', 'moderator']
    }),
    embed: embedSchema.default({
      title: 'ʜᴀɴɢᴍᴀɴ',
      description: 'Errate das Wort!',
      color: '#FFFFFF'
    })
  }).default({})
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type EmbedConfig = z.infer<typeof embedSchema>;

export const defaultConfig: AppConfig = appConfigSchema.parse({});
