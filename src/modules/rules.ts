import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ButtonInteraction,
  type Guild
} from 'discord.js';
import { buildEmbed } from '../discord/embed.js';
import { getConfig, updateConfig } from '../config/store.js';

export async function publishRules(guild: Guild): Promise<string> {
  const config = getConfig().rules;
  if (!config.channelId) throw new Error('Kein Regelkanal ausgewählt.');

  const channel = await guild.channels.fetch(config.channelId);
  if (!channel?.isTextBased() || !('send' in channel)) throw new Error('Regelkanal ist ungültig.');

  const rows: ActionRowBuilder<ButtonBuilder>[] = [];
  if (config.acceptance.enabled) {
    const button = new ButtonBuilder()
      .setCustomId('rules:accept')
      .setLabel(config.acceptance.buttonLabel)
      .setStyle(ButtonStyle.Success);
    if (config.acceptance.buttonEmoji) button.setEmoji(config.acceptance.buttonEmoji);
    rows.push(new ActionRowBuilder<ButtonBuilder>().addComponents(button));
  }

  const payload = {
    content: config.content,
    embeds: config.embed.enabled ? [buildEmbed(config.embed)] : [],
    components: rows
  };

  const old = config.messageId
    ? await channel.messages.fetch(config.messageId).catch(() => null)
    : null;
  const message = old ? await old.edit(payload) : await channel.send(payload);

  updateConfig((next) => {
    next.rules.messageId = message.id;
    return next;
  });

  return message.id;
}

export async function handleRulesButton(interaction: ButtonInteraction): Promise<boolean> {
  if (interaction.customId !== 'rules:accept') return false;
  if (!interaction.guild) return true;

  const config = getConfig().rules.acceptance;
  if (!config.enabled || !config.roleId) {
    await interaction.reply({ content: 'Die Regelbestätigung ist derzeit nicht eingerichtet.', ephemeral: true });
    return true;
  }

  const member = await interaction.guild.members.fetch(interaction.user.id);
  if (!member.roles.cache.has(config.roleId)) {
    await member.roles.add(config.roleId, 'Regeln akzeptiert');
  }
  await interaction.reply({ content: '✅ Regeln bestätigt. Danke!', ephemeral: true });
  return true;
}
