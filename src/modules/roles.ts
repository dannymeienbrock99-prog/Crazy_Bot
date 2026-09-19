import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type Guild,
  type GuildMember
} from 'discord.js';
import { getConfig, updateConfig } from '../config/store.js';
import { buildEmbedPacket } from '../discord/message.js';

const buttonStyle = {
  primary: ButtonStyle.Primary,
  secondary: ButtonStyle.Secondary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger
} as const;

export async function handleAutoRoles(member: GuildMember): Promise<void> {
  const config = getConfig().roles;
  if (config.ignoreBots && member.user.bot) return;
  if (!config.autoRoleIds.length) return;

  if (config.delayMs) await new Promise((resolve) => setTimeout(resolve, config.delayMs));

  for (const roleId of config.autoRoleIds) {
    if (member.roles.cache.has(roleId)) continue;
    await member.roles.add(roleId, 'Automatische Rolle durch Crazy_Bot').catch(() => undefined);
  }
}

export async function publishRolePanel(guild: Guild, panelId: string): Promise<string> {
  const config = getConfig();
  const panel = config.roles.panels.find((item) => item.id === panelId);
  if (!panel) throw new Error('Rollenpanel nicht gefunden.');

  const channel = await guild.channels.fetch(panel.channelId);
  if (!channel?.isTextBased() || !('send' in channel)) throw new Error('Ungültiger Rollen-Kanal.');

  const packet = buildEmbedPacket(panel.embed);
  const embed = packet.embed;

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  for (let i = 0; i < panel.entries.length; i += 5) {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (const entry of panel.entries.slice(i, i + 5)) {
      const button = new ButtonBuilder()
        .setCustomId(`role:${panel.id}:${entry.roleId}`)
        .setLabel(entry.label)
        .setStyle(buttonStyle[entry.style]);
      if (entry.emoji) button.setEmoji(entry.emoji);
      row.addComponents(button);
    }
    rows.push(row);
  }

  const message = panel.messageId
    ? await channel.messages.fetch(panel.messageId).catch(() => null)
    : null;

  const payload = { embeds: [embed], files: packet.files, components: rows };
  const result = message ? await message.edit(payload) : await channel.send(payload);

  updateConfig((next) => {
    const target = next.roles.panels.find((item) => item.id === panel.id);
    if (target) target.messageId = result.id;
    return next;
  });

  return result.id;
}

export async function handleRoleButton(interaction: ButtonInteraction): Promise<boolean> {
  if (!interaction.customId.startsWith('role:')) return false;
  const [, panelId, roleId] = interaction.customId.split(':');
  if (!panelId || !roleId || !interaction.guild) return true;

  const config = getConfig();
  const panel = config.roles.panels.find((item) => item.id === panelId);
  const entry = panel?.entries.find((item) => item.roleId === roleId);
  if (!entry) {
    await interaction.reply({ content: 'Diese Rollen-Zuordnung existiert nicht mehr.', ephemeral: true });
    return true;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (member.roles.cache.has(roleId)) {
    await member.roles.remove(roleId, 'Selbst zugewiesene Rolle entfernt');
    await interaction.reply({ content: `Rolle **${entry.label}** entfernt.`, ephemeral: true });
  } else {
    await member.roles.add(roleId, 'Selbst zugewiesene Rolle hinzugefügt');
    await interaction.reply({ content: `Rolle **${entry.label}** hinzugefügt.`, ephemeral: true });
  }
  return true;
}
