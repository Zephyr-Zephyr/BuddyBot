import { handleGuessSubmit } from '../utils/minigames.js';

export async function handleModal(interaction) {
  if (interaction.customId.startsWith('guess_modal:')) {
    await handleGuessSubmit(interaction);
  }
}
