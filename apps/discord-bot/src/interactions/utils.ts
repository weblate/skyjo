import { Logger } from "@skymo/logger"
import {
  type ButtonInteraction,
  type CommandInteraction,
  MessageFlags,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js"

type DeferrableInteraction =
  | ButtonInteraction
  | StringSelectMenuInteraction
  | ModalSubmitInteraction
  | CommandInteraction

export async function safeDefer(
  interaction: DeferrableInteraction,
  ephemeral = true,
): Promise<boolean> {
  try {
    if (interaction.deferred || interaction.replied) {
      return false
    }
    await interaction.deferReply(
      ephemeral ? { flags: MessageFlags.Ephemeral } : undefined,
    )
    return true
  } catch (error) {
    Logger.error("Failed to defer interaction:", {
      error,
      interactionId: interaction.id,
      customId: "customId" in interaction ? interaction.customId : undefined,
    })
    return false
  }
}

export async function safeReply(
  interaction: DeferrableInteraction,
  content: string,
  ephemeral = true,
): Promise<void> {
  try {
    if (interaction.deferred) {
      await interaction.editReply({ content })
    } else if (interaction.replied) {
      await interaction.followUp(
        ephemeral ? { content, flags: MessageFlags.Ephemeral } : { content },
      )
    } else {
      await interaction.reply(
        ephemeral ? { content, flags: MessageFlags.Ephemeral } : { content },
      )
    }
  } catch (error) {
    Logger.error("Failed to reply to interaction:", {
      error,
      interactionId: interaction.id,
      customId: "customId" in interaction ? interaction.customId : undefined,
      content,
    })
  }
}

export async function safeUpdate(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  options: Parameters<typeof interaction.update>[0],
): Promise<void> {
  try {
    if (interaction.deferred) {
      Logger.warn(
        "Interaction already deferred, using editReply instead of update",
        {
          customId: interaction.customId,
        },
      )
      await interaction.editReply(options)
    } else if (interaction.replied) {
      Logger.warn(
        "Interaction already replied, using editReply instead of update",
        {
          customId: interaction.customId,
        },
      )
      await interaction.editReply(options)
    } else {
      await interaction.update(options)
    }
  } catch (error) {
    Logger.error("Failed to update interaction:", {
      error,
      interactionId: interaction.id,
      customId: interaction.customId,
      deferred: interaction.deferred,
      replied: interaction.replied,
    })
    // Re-throw the error so callers can handle it
    throw error
  }
}

// These functions are kept for backward compatibility with any remaining old parsing logic
// New code should use the feature-specific parsing in feature handlers
