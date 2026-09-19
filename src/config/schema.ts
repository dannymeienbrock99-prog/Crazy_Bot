import { z } from 'zod';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);
const withDefaults = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => value ?? {}, schema);

export const embedSchema = withDefaults(z.object({
  enabled: z.boolean().default(true),
  title: z.string().max(256).default(''),
  description: z.string().max(4096).default(''),
  author: z.string().max(256).default(''),
  footer: z.string().max(2048).default(''),
  imageAssetId: z.string().nullable().default(null),
  thumbnailAssetId: z.string().nullable().default(null),
  color: hexColor.default('#FFFFFF')
}));

const textLayerSchema = withDefaults(z.object({
  enabled: z.boolean().default(true),
  x: z.number().int().min(0).default(360),
  y: z.number().int().min(0).default(180),
  fontSize: z.number().int().min(8).max(300).default(46),
  fontFamily: z.string().max(100).default('Arial'),
  color: hexColor.default('#FFFFFF'),
  template: z.string().max(500).default('{username}')
}));

const rolePanelEntrySchema = withDefaults(z.object({
  roleId: z.string().default(''),
  label: z.string().max(80).default('Neue Rolle'),
  emoji: z.string().max(80).default(''),
  style: z.enum(['primary', 'secondary', 'success', 'danger']).default('secondary')
}));

const rolePanelSchema = withDefaults(z.object({
  id: z.string().default(''),
  name: z.string().max(100).default('Rollenpanel'),
  channelId: z.string().default(''),
  messageId: z.string().default(''),
  embed: withDefaults(z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(256).default('Rollen auswählen'),
    description: z.string().max(4096).default('Wähle deine Rollen aus.'),
    author: z.string().max(256).default(''),
    footer: z.string().max(2048).default(''),
    imageAssetId: z.string().nullable().default(null),
    thumbnailAssetId: z.string().nullable().default(null),
    color: hexColor.default('#FFFFFF')
  })),
  entries: z.array(rolePanelEntrySchema).max(25).default([])
}));

const streamEntrySchema = withDefaults(z.object({
  id: z.string().default(''),
  day: z.enum(['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag']).default('Montag'),
  time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).default('20:00'),
  title: z.string().max(120).default('Stream'),
  platform: z.string().max(80).default('TikTok'),
  note: z.string().max(300).default('')
}));

const serverStatSchema = withDefaults(z.object({
  id: z.string().default(''),
  type: z.enum(['members', 'bots', 'boosts', 'voice']).default('members'),
  channelId: z.string().default(''),
  template: z.string().max(100).default('👥 Mitglieder: {value}')
}));

const generalSchema = withDefaults(z.object({
  language: z.literal('de-DE').default('de-DE'),
  timezone: z.string().default('Europe/Berlin')
}));

const brandingSchema = withDefaults(z.object({
  botDisplayName: z.string().min(1).max(32).default('Kori'),
  serverNickname: z.string().max(32).default('Kori'),
  dashboardTitle: z.string().min(1).max(80).default('Kori'),
  avatarAssetId: z.string().nullable().default(null),
  dashboardLogoAssetId: z.string().nullable().default(null),
  faviconAssetId: z.string().nullable().default(null),
  embedAccentColor: hexColor.default('#FFFFFF'),
  lockEmbedAccentWhite: z.boolean().default(true)
}));

const dynamicImageSchema = withDefaults(z.object({
  enabled: z.boolean().default(true),
  width: z.number().int().min(320).max(4096).default(1200),
  height: z.number().int().min(180).max(4096).default(500),
  backgroundAssetId: z.string().nullable().default(null),
  avatar: withDefaults(z.object({
    enabled: z.boolean().default(true),
    x: z.number().int().min(0).default(90),
    y: z.number().int().min(0).default(110),
    size: z.number().int().min(32).max(1200).default(280),
    circle: z.boolean().default(true)
  })),
  usernameText: textLayerSchema,
  memberText: withDefaults(z.object({
    enabled: z.boolean().default(true),
    x: z.number().int().min(0).default(360),
    y: z.number().int().min(0).default(245),
    fontSize: z.number().int().min(8).max(300).default(30),
    fontFamily: z.string().max(100).default('Arial'),
    color: hexColor.default('#D7D7D7'),
    template: z.string().max(500).default('Mitglied #{memberCount}')
  }))
}));

const welcomeSchema = withDefaults(z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().default(''),
  content: z.string().max(2000).default('Willkommen {mention} auf **{server}**!'),
  embed: withDefaults(z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(256).default('Willkommen!'),
    description: z.string().max(4096).default('Schön, dass du da bist.'),
    author: z.string().max(256).default(''),
    footer: z.string().max(2048).default(''),
    imageAssetId: z.string().nullable().default(null),
    thumbnailAssetId: z.string().nullable().default(null),
    color: hexColor.default('#FFFFFF')
  })),
  dynamicImage: dynamicImageSchema,
  log: withDefaults(z.object({
    channelId: z.string().default(''),
    joinEnabled: z.boolean().default(true),
    leaveEnabled: z.boolean().default(true),
    joinText: z.string().max(2000).default('➕ {user} ist dem Server beigetreten.'),
    leaveText: z.string().max(2000).default('➖ {username} hat den Server verlassen.')
  }))
}));

const rolesSchema = withDefaults(z.object({
  autoRoleIds: z.array(z.string()).max(25).default([]),
  delayMs: z.number().int().min(0).max(300000).default(0),
  ignoreBots: z.boolean().default(true),
  panels: z.array(rolePanelSchema).max(20).default([])
}));

const rulesSchema = withDefaults(z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().default(''),
  messageId: z.string().default(''),
  content: z.string().max(2000).default(''),
  embed: withDefaults(z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(256).default('• ───・9・SERVER-REGELN・9・─── •'),
    description: z.string().max(4096).default('Die Regeln gelten für alle auf diesem Server.'),
    author: z.string().max(256).default(''),
    footer: z.string().max(2048).default(''),
    imageAssetId: z.string().nullable().default(null),
    thumbnailAssetId: z.string().nullable().default(null),
    color: hexColor.default('#FFFFFF')
  })),
  acceptance: withDefaults(z.object({
    enabled: z.boolean().default(false),
    roleId: z.string().default(''),
    buttonLabel: z.string().max(80).default('Regeln akzeptieren'),
    buttonEmoji: z.string().max(80).default('✅')
  }))
}));

const tiktokLiveSchema = withDefaults(z.object({
  enabled: z.boolean().default(false),
  uniqueId: z.string().default(''),
  channelId: z.string().default(''),
  mentionMode: z.enum(['everyone', 'role', 'none']).default('everyone'),
  mentionRoleId: z.string().default(''),
  content: z.string().max(2000).default('{mention} 🔴 **{creator} ist jetzt auf TikTok LIVE!**'),
  reconnectSeconds: z.number().int().min(30).max(1800).default(60),
  buttonLabel: z.string().max(80).default('TikTok öffnen'),
  embed: withDefaults(z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(256).default('🔴 Jetzt LIVE auf TikTok'),
    description: z.string().max(4096).default('Komm in den Stream!'),
    author: z.string().max(256).default(''),
    footer: z.string().max(2048).default(''),
    imageAssetId: z.string().nullable().default(null),
    thumbnailAssetId: z.string().nullable().default(null),
    color: hexColor.default('#FFFFFF')
  }))
}));

const modStampSchema = withDefaults(z.object({
  allowedRoleIds: z.array(z.string()).max(25).default([]),
  voteRoleIds: z.array(z.string()).max(25).default([]),
  reminderMinutes: z.array(z.number().int().min(1).max(10080)).max(10).default([60, 15]),
  embed: withDefaults(z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(256).default('🛡️ Mod-Stempel'),
    description: z.string().max(4096).default('Bitte Teilnahme auswählen.'),
    author: z.string().max(256).default(''),
    footer: z.string().max(2048).default(''),
    imageAssetId: z.string().nullable().default(null),
    thumbnailAssetId: z.string().nullable().default(null),
    color: hexColor.default('#FFFFFF')
  }))
}));

const streamPlanSchema = withDefaults(z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().default(''),
  messageId: z.string().default(''),
  entries: z.array(streamEntrySchema).max(50).default([]),
  embed: withDefaults(z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(256).default('📅 Streamplan'),
    description: z.string().max(4096).default('Unser aktueller Streamplan'),
    author: z.string().max(256).default(''),
    footer: z.string().max(2048).default(''),
    imageAssetId: z.string().nullable().default(null),
    thumbnailAssetId: z.string().nullable().default(null),
    color: hexColor.default('#FFFFFF')
  }))
}));

const serverStatsSchema = withDefaults(z.object({
  enabled: z.boolean().default(false),
  intervalSeconds: z.number().int().min(60).max(3600).default(300),
  stats: z.array(serverStatSchema).max(10).default([
    { id: 'members', type: 'members', channelId: '', template: '👥 Mitglieder: {value}' },
    { id: 'boosts', type: 'boosts', channelId: '', template: '💎 Boosts: {value}' },
    { id: 'voice', type: 'voice', channelId: '', template: '🔊 Im Voice: {value}' }
  ])
}));

const hangmanSchema = withDefaults(z.object({
  enabled: z.boolean().default(false),
  channelId: z.string().default(''),
  maxWrong: z.number().int().min(3).max(12).default(7),
  allowSameUser: z.boolean().default(true),
  words: z.record(z.string(), z.array(z.string().min(2).max(60))).default({
    Allgemein: ['discord', 'stream', 'community', 'gaming', 'moderator']
  }),
  embed: withDefaults(z.object({
    enabled: z.boolean().default(true),
    title: z.string().max(256).default('ʜᴀɴɢᴍᴀɴ'),
    description: z.string().max(4096).default('Errate das Wort!'),
    author: z.string().max(256).default(''),
    footer: z.string().max(2048).default(''),
    imageAssetId: z.string().nullable().default(null),
    thumbnailAssetId: z.string().nullable().default(null),
    color: hexColor.default('#FFFFFF')
  }))
}));

const backupSchema = withDefaults(z.object({
  automaticEnabled: z.boolean().default(true),
  intervalHours: z.number().int().min(1).max(168).default(24),
  keepFiles: z.number().int().min(1).max(90).default(14)
}));

export const appConfigSchema = z.object({
  version: z.literal(1).default(1),
  general: generalSchema,
  branding: brandingSchema,
  welcome: welcomeSchema,
  roles: rolesSchema,
  rules: rulesSchema,
  tiktokLive: tiktokLiveSchema,
  modStamp: modStampSchema,
  streamPlan: streamPlanSchema,
  serverStats: serverStatsSchema,
  hangman: hangmanSchema,
  backup: backupSchema
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type EmbedConfig = z.infer<typeof embedSchema>;

export const defaultConfig: AppConfig = appConfigSchema.parse({});
