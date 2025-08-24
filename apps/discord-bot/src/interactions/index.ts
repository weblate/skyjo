import { Logger } from "@skymo/logger"
import { type Interaction, MessageFlags } from "discord.js"
import { InteractionRouter } from "./router.js"

export async function handleInteraction(
  interaction: Interaction,
): Promise<void> {
  try {
    const router = InteractionRouter.getInstance()

    // Determine if we should defer based on interaction type and customId
    const shouldDefer = shouldDeferInteraction(interaction)

    if (shouldDefer) {
      if (interaction.isButton() || interaction.isStringSelectMenu()) {
        // For buttons and select menus, use deferUpdate to avoid ephemeral issues
        await interaction.deferUpdate()
      } else if (interaction.isModalSubmit() && interaction.isRepliable()) {
        // For modals, defer normally (no ephemeral flag needed since we update original message)
        await interaction.deferReply()
      }
    }

    if (interaction.isButton()) {
      await router.routeButton(interaction)
    } else if (interaction.isModalSubmit()) {
      await router.routeModal(interaction)
    } else if (interaction.isStringSelectMenu()) {
      await router.routeSelect(interaction)
    }
  } catch (error) {
    Logger.error("Error in interaction handler:", {
      error,
      interactionId: interaction.id,
    })

    if (
      interaction.isRepliable() &&
      !interaction.replied &&
      !interaction.deferred
    ) {
      await interaction.reply({
        content: "An error occurred while processing your request.",
        flags: MessageFlags.Ephemeral,
      })
    }
  }
}

function shouldDeferInteraction(interaction: Interaction): boolean {
  const customId = "customId" in interaction ? interaction.customId : null
  if (!customId) return false

  const router = InteractionRouter.getInstance()

  if (interaction.isButton()) {
    return router.shouldDeferInteraction(customId, "button")
  } else if (interaction.isModalSubmit()) {
    return router.shouldDeferInteraction(customId, "modal")
  } else if (interaction.isStringSelectMenu()) {
    return router.shouldDeferInteraction(customId, "select")
  }

  return false
}
