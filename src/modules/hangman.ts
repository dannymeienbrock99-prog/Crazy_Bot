import {
  PermissionFlagsBits,
  type ChatInputCommandInteraction,
  type Message
} from 'discord.js';
import { db } from '../core/database.js';
import { getConfig } from '../config/store.js';
import { buildEmbed } from '../discord/embed.js';

type GameRow = {
  guild_id: string;
  channel_id: string;
  word: string;
  category: string;
  guessed: string;
  wrong: string;
  started_by: string;
  status: string;
  updated_at: string;
};

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('de-DE');
}

function letters(value: string): string[] {
  return Array.from(normalize(value));
}

function renderWord(word: string, guessed: string[]): string {
  return letters(word)
    .map((char) => {
      if (!/[a-zäöüß]/i.test(char)) return char;
      return guessed.includes(char) ? char.toUpperCase() : '_';
    })
    .join(' ');
}

function gameEmbed(row: GameRow) {
  const guessed = JSON.parse(row.guessed) as string[];
  const wrong = JSON.parse(row.wrong) as string[];
  const cfg = getConfig().hangman;
  return buildEmbed(cfg.embed)
    .setDescription(`**Kategorie:** ${row.category}\n\n${renderWord(row.word, guessed)}`)
    .addFields(
      { name: 'Falsche Buchstaben', value: wrong.join(', ').toUpperCase() || '—', inline: false },
      { name: 'Versuche', value: `${wrong.length} / ${cfg.maxWrong}`, inline: true }
    );
}

export async function handleHangmanCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild || !interaction.channel) return;
  const cfg = getConfig().hangman;
  const sub = interaction.options.getSubcommand();

  if (sub === 'start') {
    if (!cfg.enabled) {
      await interaction.reply({ content: 'Hangman ist deaktiviert.', ephemeral: true });
      return;
    }
    if (cfg.channelId && interaction.channel.id !== cfg.channelId) {
      await interaction.reply({ content: `Hangman läuft nur in <#${cfg.channelId}>.`, ephemeral: true });
      return;
    }

    const requested = interaction.options.getString('kategorie');
    const categories = Object.keys(cfg.words);
    const category = requested && cfg.words[requested]?.length ? requested : categories[0];
    if (!category) {
      await interaction.reply({ content: 'Es sind keine Wörter konfiguriert.', ephemeral: true });
      return;
    }
    const list = cfg.words[category] ?? [];
    const word = list[Math.floor(Math.random() * list.length)];
    if (!word) {
      await interaction.reply({ content: 'In dieser Kategorie gibt es keine Wörter.', ephemeral: true });
      return;
    }

    const row: GameRow = {
      guild_id: interaction.guild.id,
      channel_id: interaction.channel.id,
      word: normalize(word),
      category,
      guessed: '[]',
      wrong: '[]',
      started_by: interaction.user.id,
      status: 'open',
      updated_at: new Date().toISOString()
    };

    db.prepare(`
      INSERT INTO hangman_games(guild_id, channel_id, word, category, guessed, wrong, started_by, status, updated_at)
      VALUES(@guild_id, @channel_id, @word, @category, @guessed, @wrong, @started_by, @status, @updated_at)
      ON CONFLICT(guild_id) DO UPDATE SET
        channel_id=excluded.channel_id, word=excluded.word, category=excluded.category,
        guessed=excluded.guessed, wrong=excluded.wrong, started_by=excluded.started_by,
        status=excluded.status, updated_at=excluded.updated_at
    `).run(row);

    await interaction.reply({ embeds: [gameEmbed(row)] });
    return;
  }

  const row = db.prepare('SELECT * FROM hangman_games WHERE guild_id = ?').get(interaction.guild.id) as GameRow | undefined;
  if (sub === 'status') {
    if (!row || row.status !== 'open') {
      await interaction.reply({ content: 'Aktuell läuft kein Hangman-Spiel.', ephemeral: true });
      return;
    }
    await interaction.reply({ embeds: [gameEmbed(row)], ephemeral: true });
    return;
  }

  if (sub === 'stop') {
    const canStop =
      row?.started_by === interaction.user.id ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages);
    if (!row || !canStop) {
      await interaction.reply({ content: 'Du kannst dieses Spiel nicht stoppen.', ephemeral: true });
      return;
    }
    db.prepare("UPDATE hangman_games SET status='closed', updated_at=? WHERE guild_id=?")
      .run(new Date().toISOString(), interaction.guild.id);
    await interaction.reply('Hangman wurde beendet.');
  }
}

export async function handleHangmanMessage(message: Message): Promise<void> {
  if (!message.guild || message.author.bot) return;
  const cfg = getConfig().hangman;
  if (!cfg.enabled || (cfg.channelId && message.channel.id !== cfg.channelId)) return;

  const row = db.prepare(
    "SELECT * FROM hangman_games WHERE guild_id = ? AND status = 'open'"
  ).get(message.guild.id) as GameRow | undefined;
  if (!row || row.channel_id !== message.channel.id) return;

  const guess = normalize(message.content);
  if (!guess || guess.length > 60) return;

  const guessed = JSON.parse(row.guessed) as string[];
  const wrong = JSON.parse(row.wrong) as string[];
  const wordLetters = letters(row.word);

  let won = false;
  if (guess.length === 1) {
    if (!/[a-zäöüß]/i.test(guess) || guessed.includes(guess) || wrong.includes(guess)) return;
    if (wordLetters.includes(guess)) guessed.push(guess);
    else wrong.push(guess);
  } else if (guess === row.word) {
    for (const char of wordLetters) if (/[a-zäöüß]/i.test(char) && !guessed.includes(char)) guessed.push(char);
    won = true;
  } else {
    wrong.push(`Wort: ${guess}`);
  }

  if (wordLetters.filter((char) => /[a-zäöüß]/i.test(char)).every((char) => guessed.includes(char))) won = true;
  const lost = wrong.length >= cfg.maxWrong;
  const status = won || lost ? 'closed' : 'open';

  const next: GameRow = {
    ...row,
    guessed: JSON.stringify(guessed),
    wrong: JSON.stringify(wrong),
    status,
    updated_at: new Date().toISOString()
  };

  db.prepare('UPDATE hangman_games SET guessed=?, wrong=?, status=?, updated_at=? WHERE guild_id=?')
    .run(next.guessed, next.wrong, next.status, next.updated_at, message.guild.id);

  if (won) {
    await message.reply(`🎉 Richtig! Das Wort war **${row.word.toUpperCase()}**.`);
  } else if (lost) {
    await message.reply(`💀 Verloren. Das Wort war **${row.word.toUpperCase()}**.`);
  } else {
    await message.reply({ embeds: [gameEmbed(next)] });
  }
}
