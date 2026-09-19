import crypto from 'node:crypto';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type GuildMember
} from 'discord.js';
import { db } from '../core/database.js';
import { getConfig } from '../config/store.js';
import { buildEmbedPacket } from '../discord/message.js';

function hasAnyRole(interaction: ChatInputCommandInteraction | ButtonInteraction, roleIds: string[]): boolean {
  if (!roleIds.length) return false;
  const member = interaction.member as GuildMember | null;
  return roleIds.some((roleId) => member?.roles.cache.has(roleId));
}

function buttons(id: string) {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`stamp:${id}:yes`).setLabel('Dabei').setEmoji('✅').setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`stamp:${id}:maybe`).setLabel('Unsicher').setEmoji('❓').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`stamp:${id}:no`).setLabel('Nicht dabei').setEmoji('❌').setStyle(ButtonStyle.Danger)
  );
}

function parseDateTime(date: string, time: string): string {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(date);
  if (!match || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    throw new Error('Datum bitte als TT.MM.JJJJ und Uhrzeit als HH:MM angeben.');
  }
  return `${match[3]}-${match[2]}-${match[1]}T${time}:00`;
}

function voteLists(stampId: string): { yes: string[]; maybe: string[]; no: string[] } {
  const rows = db.prepare('SELECT user_id, response FROM mod_stamp_votes WHERE stamp_id = ?').all(stampId) as
    { user_id: string; response: 'yes' | 'maybe' | 'no' }[];
  const result = { yes: [] as string[], maybe: [] as string[], no: [] as string[] };
  for (const row of rows) result[row.response].push(`<@${row.user_id}>`);
  return result;
}

function stampPacket(stamp: {
  id: string;
  title: string;
  start_at: string;
  description: string;
}) {
  const packet = buildEmbedPacket(getConfig().modStamp.embed);
  const votes = voteLists(stamp.id);
  packet.embed
    .setTitle(`🛡️ ${stamp.title}`)
    .setDescription(stamp.description || 'Bitte Teilnahme auswählen.')
    .addFields(
      { name: '📅 Termin', value: stamp.start_at.replace('T', ' '), inline: false },
      { name: `✅ Dabei (${votes.yes.length})`, value: votes.yes.join('\n') || '—', inline: true },
      { name: `❓ Unsicher (${votes.maybe.length})`, value: votes.maybe.join('\n') || '—', inline: true },
      { name: `❌ Nicht dabei (${votes.no.length})`, value: votes.no.join('\n') || '—', inline: true }
    );
  return packet;
}

export async function createModStamp(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel || !('send' in interaction.channel)) return;
  const cfg = getConfig().modStamp;
  const allowed =
    hasAnyRole(interaction, cfg.allowedRoleIds) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

  if (!allowed) {
    await interaction.reply({ content: 'Du darfst keine Mod-Stempel erstellen.', ephemeral: true });
    return;
  }

  const title = interaction.options.getString('titel', true);
  const date = interaction.options.getString('datum', true);
  const time = interaction.options.getString('uhrzeit', true);
  const description = interaction.options.getString('beschreibung') ?? '';
  const startAt = parseDateTime(date, time);
  const id = crypto.randomUUID();

  db.prepare(`
    INSERT INTO mod_stamps(id, guild_id, channel_id, title, start_at, description, created_by, status, created_at)
    VALUES(?, ?, ?, ?, ?, ?, ?, 'open', ?)
  `).run(id, interaction.guild.id, interaction.channel.id, title, startAt, description, interaction.user.id, new Date().toISOString());

  const stamp = { id, title, start_at: startAt, description };
  const packet = stampPacket(stamp);
  const message = await interaction.channel.send({ embeds: [packet.embed], files: packet.files, components: [buttons(id)] });
  db.prepare('UPDATE mod_stamps SET message_id = ? WHERE id = ?').run(message.id, id);

  await interaction.reply({ content: 'Mod-Stempel wurde erstellt.', ephemeral: true });
}

export async function handleModStampButton(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith('stamp:')) return false;
  const [, id, response] = interaction.customId.split(':');
  if (!id || !['yes', 'maybe', 'no'].includes(response ?? '')) return true;

  const cfg = getConfig().modStamp;
  if (cfg.voteRoleIds.length && !hasAnyRole(interaction, cfg.voteRoleIds)) {
    await interaction.reply({ content: 'Du bist für diesen Mod-Stempel nicht freigeschaltet.', ephemeral: true });
    return true;
  }

  const stamp = db.prepare('SELECT * FROM mod_stamps WHERE id = ?').get(id) as
    | { id: string; title: string; start_at: string; description: string; status: string }
    | undefined;
  if (!stamp || stamp.status !== 'open') {
    await interaction.reply({ content: 'Dieser Mod-Stempel ist geschlossen.', ephemeral: true });
    return true;
  }

  db.prepare(`
    INSERT INTO mod_stamp_votes(stamp_id, user_id, response, updated_at)
    VALUES(?, ?, ?, ?)
    ON CONFLICT(stamp_id, user_id)
    DO UPDATE SET response = excluded.response, updated_at = excluded.updated_at
  `).run(id, interaction.user.id, response, new Date().toISOString());

  const packet = stampPacket(stamp);
  await interaction.update({ embeds: [packet.embed], files: packet.files, components: [buttons(id)] });
  return true;
}
