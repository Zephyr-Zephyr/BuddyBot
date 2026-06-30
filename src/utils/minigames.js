import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { RPS_PREFIX, TTT_PREFIX } from './constants.js';

const CHOICES = ['rock', 'paper', 'scissors'];
const CHOICE_EMOJI = { rock: '🪪', paper: '📄', scissors: '✌️' };

const WIN_MAP = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

export async function startRps(interaction) {
  const row = new ActionRowBuilder().addComponents(
    CHOICES.map((choice) =>
      new ButtonBuilder()
        .setCustomId(`${RPS_PREFIX}${choice}`)
        .setLabel(choice.charAt(0).toUpperCase() + choice.slice(1))
        .setEmoji(CHOICE_EMOJI[choice])
        .setStyle(ButtonStyle.Primary)
    )
  );

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('✌️ Rock, Paper, Scissors')
    .setDescription('Choose your hand!');

  await interaction.reply({ embeds: [embed], components: [row] });
}

export async function handleRpsChoice(interaction, playerChoice) {
  if (!CHOICES.includes(playerChoice)) return;

  const botChoice = CHOICES[Math.floor(Math.random() * CHOICES.length)];
  let result;

  if (playerChoice === botChoice) {
    result = '🤚 Draw!';
  } else if (WIN_MAP[playerChoice] === botChoice) {
    result = '🎉 You win!';
  } else {
    result = '😢 You lose!';
  }

  const embed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(
    `You: ${CHOICE_EMOJI[playerChoice]} **${playerChoice}**\nBot: ${CHOICE_EMOJI[botChoice]} **${botChoice}**\n\n${result}`
  );

  await interaction.update({ embeds: [embed], components: [] });
}

const TTT_WINS = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function checkTttWinner(board) {
  for (const [a, b, c] of TTT_WINS) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return board.every(Boolean) ? 'draw' : null;
}

function botTttMove(board) {
  const empty = board.map((v, i) => (v ? null : i)).filter((v) => v !== null);

  for (const i of empty) {
    const test = [...board];
    test[i] = 'O';
    if (checkTttWinner(test) === 'O') return i;
  }
  for (const i of empty) {
    const test = [...board];
    test[i] = 'X';
    if (checkTttWinner(test) === 'X') return i;
  }
  if (empty.includes(4)) return 4;
  return empty[Math.floor(Math.random() * empty.length)];
}

function buildTttBoard(board, gameId, disabled = false) {
  const symbols = board.map((cell) => cell || '⬜');
  const rows = [];
  for (let r = 0; r < 3; r++) {
    const row = new ActionRowBuilder();
    for (let c = 0; c < 3; c++) {
      const i = r * 3 + c;
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`${TTT_PREFIX}${gameId}:${i}`)
          .setLabel(symbols[i] === '⬜' ? ' ' : symbols[i])
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(disabled || Boolean(board[i]))
      );
    }
    rows.push(row);
  }
  return rows;
}

const activeTttGames = new Map();

export async function startTtt(interaction) {
  const gameId = `${interaction.user.id}-${Date.now()}`;
  const board = Array(9).fill(null);
  activeTttGames.set(gameId, { board, player: interaction.user.id });

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('⭕ Tic-Tac-Toe')
    .setDescription(`${interaction.user} is **X**. The bot is **O**.\nYou go first!`);

  await interaction.reply({
    embeds: [embed],
    components: buildTttBoard(board, gameId),
  });
}

export async function handleTttMove(interaction, payload) {
  const [gameId, indexStr] = payload.split(':');
  const index = Number(indexStr);
  const game = activeTttGames.get(gameId);

  if (!game || game.player !== interaction.user.id) {
    await interaction.reply({ content: '❌ This game doesn\'t belong to you.', ephemeral: true });
    return;
  }

  if (game.board[index]) {
    await interaction.reply({ content: '❌ Field already occupied.', ephemeral: true });
    return;
  }

  game.board[index] = 'X';
  let winner = checkTttWinner(game.board);

  if (!winner) {
    const botIndex = botTttMove(game.board);
    if (botIndex !== undefined) game.board[botIndex] = 'O';
    winner = checkTttWinner(game.board);
  }

  let description;
  if (winner === 'X') description = '🎉 You win!';
  else if (winner === 'O') description = '😢 The bot wins!';
  else if (winner === 'draw') description = '🤚 Draw!';
  else description = `${interaction.user} is **X**, bot is **O**.`;

  const embed = EmbedBuilder.from(interaction.message.embeds[0]).setDescription(description);
  const finished = Boolean(winner);

  if (finished) activeTttGames.delete(gameId);

  await interaction.update({
    embeds: [embed],
    components: buildTttBoard(game.board, gameId, finished),
  });
}

export async function startGuess(interaction) {
  const secret = Math.floor(Math.random() * 100) + 1;
  const gameId = `${interaction.user.id}-${Date.now()}`;

  interaction.client.guessGames ??= new Map();
  interaction.client.guessGames.set(gameId, { secret, attempts: 0, maxAttempts: 7 });

  const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = await import('discord.js');

  const modal = new ModalBuilder()
    .setCustomId(`guess_modal:${gameId}`)
    .setTitle('Guess a Number (1-100)');

  modal.addComponents(
    new ActionRowBuilder().addComponents(
      new TextInputBuilder()
        .setCustomId('guess_number')
        .setLabel('Your Number')
        .setPlaceholder('Enter a number between 1 and 100')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(3)
    )
  );

  await interaction.showModal(modal);
}

export async function handleGuessSubmit(interaction) {
  const gameId = interaction.customId.split(':')[1];
  interaction.client.guessGames ??= new Map();
  const game = interaction.client.guessGames.get(gameId);

  if (!game) {
    await interaction.reply({ content: '❌ Game expired. Start a new one with `/minigame guess`.', ephemeral: true });
    return;
  }

  const guess = Number(interaction.fields.getTextInputValue('guess_number'));
  if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
    await interaction.reply({ content: '❌ Please enter a valid number between 1 and 100.', ephemeral: true });
    return;
  }

  game.attempts += 1;

  if (guess === game.secret) {
    interaction.client.guessGames.delete(gameId);
    await interaction.reply({
      content: `🎉 Correct! The number was **${game.secret}**. You took ${game.attempts} attempt(s).`,
      ephemeral: true,
    });
    return;
  }

  if (game.attempts >= game.maxAttempts) {
    interaction.client.guessGames.delete(gameId);
    await interaction.reply({
      content: `😢 Game Over! The number was **${game.secret}**.`,
      ephemeral: true,
    });
    return;
  }

  const hint = guess < game.secret ? '📈 Higher!' : '📉 Lower!';
  await interaction.reply({
    content: `${hint} (${game.maxAttempts - game.attempts} attempts left)`,
    ephemeral: true,
  });
}

const TRIVIA = [
  { q: 'How many planets does our solar system have (officially)?', a: ['8', 'eight'], hint: 'Since Pluto ...' },
  { q: 'In which year was Discord founded?', a: ['2015'], hint: 'Mid 2010s' },
  { q: 'What is the capital of France?', a: ['paris'], hint: 'City of love' },
  { q: 'How many bits does a byte have?', a: ['8', 'eight'], hint: 'A power of 2' },
  { q: 'Which programming language runs in the browser?', a: ['javascript', 'js'], hint: 'Not Java!' },
];

export async function startTrivia(interaction) {
  const item = TRIVIA[Math.floor(Math.random() * TRIVIA.length)];

  interaction.client.triviaGames ??= new Map();
  interaction.client.triviaGames.set(interaction.user.id, item);

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle('🧠 Trivia')
    .setDescription(`**${item.q}**\n\nAnswer with \`/minigame answer <text>\`.\n_Hint:_ ${item.hint}`)
    .setFooter({ text: '60 seconds' });

  await interaction.reply({ embeds: [embed] });

  setTimeout(() => {
    if (interaction.client.triviaGames?.get(interaction.user.id) === item) {
      interaction.client.triviaGames.delete(interaction.user.id);
    }
  }, 60_000);
}

export async function answerTrivia(interaction, answer) {
  interaction.client.triviaGames ??= new Map();
  const item = interaction.client.triviaGames.get(interaction.user.id);

  if (!item) {
    await interaction.reply({
      content: '❌ No active trivia. Start one with `/minigame trivia`.',
      ephemeral: true,
    });
    return;
  }

  const normalized = answer.trim().toLowerCase();
  if (item.a.some((a) => a.toLowerCase() === normalized)) {
    interaction.client.triviaGames.delete(interaction.user.id);
    await interaction.reply({ content: '🎉 Correct! Well done!', ephemeral: true });
  } else {
    await interaction.reply({ content: '❌ Wrong! Try again.', ephemeral: true });
  }
}
