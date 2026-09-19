import {
  Client,
  GatewayIntentBits,
  Events,
  type ChatInputCommandInteraction
} from 'discord.js';
import { env } from '../env.js';
import { log } from '../core/logger.js';
import { commands } from './commands.js';
import { handleJoin, handleLeave } from '../modules/welcome.js';
import { handleAutoRoles, handleRoleButton } from '../modules/roles.js';
import { handleRulesButton } from '../modules/rules.js';
import { createModStamp, handleModStampButton } from '../modules/mod-stamp.js';
import { handleHangmanCommand, handleHangmanMessage } from '../modules/hangman.js';
import { startServerStats, stopServerStats } from '../modules/server-stats.js';
import { startTikTokLive, stopTikTokLive } from '../services/tiktok-live.js';
import { getConfig } from '../config/store.js';
import { startModStampReminders, stopModStampReminders } from '../services/mod-stamp-reminders.js';

export let discordClient: Client | null = null;

async function handleCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (interaction.commandName === 'bot') {
    const cfg = getConfig();
    await interaction.reply({
      content: [
        `**${cfg.branding.botDisplayName}** ist online.`,
        `Dashboard: aktiv`,
        `Server: ${interaction.guild?.name ?? '—'}`
      ].join('\n'),
      ephemeral: true
    });
    return;
  }

  if (interaction.commandName === 'stempel') {
    await createModStamp(interaction);
    return;
  }

  if (interaction.commandName === 'hangman') {
    await handleHangmanCommand(interaction);
  }
}

async function registerCommands(client: Client): Promise<void> {
  if (!client.application) return;

  const detectedGuildId =
    env.discordGuildId ||
    (client.guilds.cache.size === 1 ? client.guilds.cache.first()?.id ?? '' : '');

  if (detectedGuildId) {
    await client.application.commands.set(commands, detectedGuildId);
    log.info('Slash Commands als Guild-Commands registriert.', { guildId: detectedGuildId });
    return;
  }

  await client.application.commands.set(commands);
  log.info('Slash Commands global registriert.');
}

export async function startDiscordBot(): Promise<Client | null> {
  if (!env.discordToken) {
    log.warn('Discord ist noch nicht eingerichtet. Dashboard startet mit grafischer Ersteinrichtung.');
    return null;
  }

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildVoiceStates
    ]
  });
  discordClient = client;

  client.once(Events.ClientReady, async (ready) => {
    log.info('Discord verbunden.', { user: ready.user.tag, guilds: ready.guilds.cache.size });
    await registerCommands(ready);
    startServerStats(ready);
    startTikTokLive(ready);
    startModStampReminders(ready);
  });

  client.on(Events.GuildCreate, async (guild) => {
    try {
      await client.application?.commands.set(commands, guild.id);
      log.info('Slash Commands für neu hinzugefügten Server registriert.', { guildId: guild.id });
    } catch (error) {
      log.warn('Slash Commands konnten für den neuen Server nicht registriert werden.', String(error));
    }
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    await handleAutoRoles(member);
    await handleJoin(member);
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    await handleLeave(member);
  });

  client.on(Events.MessageCreate, async (message) => {
    await handleHangmanMessage(message);
  });

  client.on(Events.InteractionCreate, async (interaction) => {
    try {
      if (interaction.isButton()) {
        if (await handleRoleButton(interaction)) return;
        if (await handleRulesButton(interaction)) return;
        if (await handleModStampButton(interaction)) return;
      }
      if (interaction.isChatInputCommand()) await handleCommand(interaction);
    } catch (error) {
      log.error('Discord-Interaktion fehlgeschlagen.', String(error));
      if (interaction.isRepliable()) {
        const payload = { content: 'Die Aktion konnte nicht ausgeführt werden.', ephemeral: true } as const;
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => undefined);
        else await interaction.reply(payload).catch(() => undefined);
      }
    }
  });

  client.on(Events.Error, (error) => log.error('Discord Client Fehler.', String(error)));

  try {
    await client.login(env.discordToken);
    return client;
  } catch (error) {
    log.error('Discord-Anmeldung fehlgeschlagen. Dashboard bleibt zur Reparatur erreichbar.', String(error));
    client.destroy();
    discordClient = null;
    return null;
  }
}

export async function stopDiscordBot(): Promise<void> {
  stopServerStats();
  stopModStampReminders();
  await stopTikTokLive();
  discordClient?.destroy();
  discordClient = null;
}
