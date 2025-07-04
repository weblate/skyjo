import { Logger } from "@skymo/logger"
import { type Interaction } from "discord.js"
import { handleButtonInteraction } from "./button.js"
import { handleModalInteraction } from "./modal.js"

export async function handleInteraction(interaction: Interaction): Promise<void> {
  try {
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction)
    } else if (interaction.isModalSubmit()) {
      await handleModalInteraction(interaction)
    }
  } catch (error) {
    Logger.error("Error in interaction handler:", { error, interactionId: interaction.id })
    
    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        ephemeral: true,
      })
    }
  }
}