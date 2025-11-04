import { reportTable } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import type { PenaltyType } from "@skymo/shared/types"
import type { CreatePenalty } from "@skymo/shared/validations"
import {
  ActionRowBuilder,
  type ButtonInteraction,
  EmbedBuilder,
  ModalBuilder,
  type ModalSubmitInteraction,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import { eq } from "drizzle-orm"
import { ApiClient } from "../../api.js"
import { db } from "../../database.js"
import type { InteractionHandler } from "../../interactions/router.js"

/**
 * Parse report-specific custom IDs
 * Format: "report:action:reportId:...params"
 */
function parseReportCustomId(customId: string): {
  action: string
  reportId: string
  params: string[]
} {
  const parts = customId.split(":")
  if (parts.length < 3 || parts[0] !== "report") {
    throw new Error(`Invalid report custom ID: ${customId}`)
  }
  const action = parts[1]
  const reportId = parts[2]
  if (!action || !reportId) {
    throw new Error(`Invalid report custom ID: ${customId}`)
  }
  return {
    action,
    reportId,
    params: parts.slice(3),
  }
}

/**
 * Button handlers for report feature
 */
const buttonHandlers = {
  async dismiss(interaction: ButtonInteraction): Promise<void> {
    const { reportId } = parseReportCustomId(interaction.customId)

    const modal = new ModalBuilder()
      .setCustomId(`report:dismiss_modal:${reportId}`)
      .setTitle("Dismiss Report")

    const reasonInput = new TextInputBuilder()
      .setCustomId("reason")
      .setLabel("Reason for dismissal")
      .setStyle(TextInputStyle.Paragraph)
      .setPlaceholder("Enter the reason for dismissing this report...")
      .setRequired(true)
      .setMaxLength(500)

    const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
      reasonInput,
    )
    modal.addComponents(actionRow)

    await interaction.showModal(modal)
  },

  async validate(interaction: ButtonInteraction): Promise<void> {
    const { reportId } = parseReportCustomId(interaction.customId)

    const penaltyTypeSelect = new StringSelectMenuBuilder()
      .setCustomId(`report:penalty_type:${reportId}`)
      .setPlaceholder("Select penalty type (optional)")
      .addOptions([
        {
          label: "No Penalty (Warning Only)",
          value: "none",
          description: "Validate report but apply no penalty",
        },
        {
          label: "Leavebuster",
          value: "leavebuster",
          description: "Temporary restriction on joining games",
        },
        {
          label: "Chat Restriction",
          value: "chat_restrict",
          description: "Disable chat functionality",
        },
        {
          label: "Temporary Ban",
          value: "tempban",
          description: "Temporary ban from playing games",
        },
        {
          label: "Permanent Ban",
          value: "ban",
          description: "Permanent account ban",
        },
      ])

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      penaltyTypeSelect,
    )

    await interaction.update({
      content: "Select a penalty to apply:",
      components: [row],
    })
  },
}

/**
 * Modal handlers for report feature
 */
const modalHandlers = {
  async dismiss_modal(interaction: ModalSubmitInteraction): Promise<void> {
    const { reportId } = parseReportCustomId(interaction.customId)
    const moderatorComment = interaction.fields.getTextInputValue("reason")

    try {
      const [report] = await db
        .select()
        .from(reportTable)
        .where(eq(reportTable.id, Number(reportId)))
        .limit(1)

      if (!report) {
        Logger.error("Report not found for dismissal", { reportId })
        return
      }

      if (report.userId === null) {
        await db.delete(reportTable).where(eq(reportTable.id, Number(reportId)))
        Logger.info(`Deleted report record for anonymous user`, { reportId })
      } else {
        await db
          .update(reportTable)
          .set({
            validation: false,
            moderatorComment,
          })
          .where(eq(reportTable.id, Number(reportId)))
        Logger.info(`Updated report record with dismissal`, {
          reportId,
          userId: report.userId,
        })
      }

      await updateOriginalMessage(
        interaction,
        reportId,
        false,
        moderatorComment,
      )

      Logger.info(`Report ${reportId} dismissed by moderator`, {
        moderatorComment,
      })
    } catch (error) {
      Logger.error("Error dismissing report:", { error, reportId })
      // Try to update original message with error state
      try {
        await updateOriginalMessage(
          interaction,
          reportId,
          false,
          "Error occurred during dismissal",
          "❌ Processing Error",
        )
      } catch (updateError) {
        Logger.error("Failed to update message with error state:", {
          updateError,
        })
      }
    }
  },

  async penalty_modal(interaction: ModalSubmitInteraction): Promise<void> {
    const parsed = parseReportCustomId(interaction.customId)
    const reportId = parsed.reportId
    const penaltyType = parsed.params[0] as PenaltyType | "none"
    const duration = parsed.params[1] || ""
    const moderatorComment = interaction.fields.getTextInputValue("reason")

    if (!penaltyType) {
      Logger.error("Invalid penalty data in modal", {
        customId: interaction.customId,
      })
      return
    }

    try {
      const [report] = await db
        .select()
        .from(reportTable)
        .where(eq(reportTable.id, Number(reportId)))
        .limit(1)

      if (!report) {
        Logger.error("Report not found for penalty application", { reportId })
        return
      }

      // Update report as validated
      await db
        .update(reportTable)
        .set({
          validation: true,
          moderatorComment,
        })
        .where(eq(reportTable.id, Number(reportId)))

      const gameCode = report.reportData.gameCode
      const reportedPlayerId = report.reportData.reportedPlayerId

      // Kick the player from the game if it's active
      const apiClient = ApiClient.getInstance()
      const gameStatus = await apiClient.checkGameStatus(gameCode)
      if (gameStatus.isActive && gameStatus.hasPlayer) {
        await apiClient.kickPlayer(gameCode, reportedPlayerId)
      }

      // Apply penalty if not "none"
      if (penaltyType !== "none") {
        const penaltyData: CreatePenalty = {
          targetUserId: report.userId ?? undefined,
          targetGuestId: report.guestId ?? undefined,
          type: penaltyType,
          reason: moderatorComment,
          reportId: +reportId,
        }

        // Add specific penalty parameters
        if (penaltyType === "leavebuster" && duration) {
          penaltyData.level = +duration
        } else if (
          (penaltyType === "chat_restrict" || penaltyType === "tempban") &&
          duration
        ) {
          penaltyData.durationMinutes = +duration
        }
        await apiClient.applyPenalty(penaltyData)
      }

      // Update Discord embed
      const penaltyDisplay =
        penaltyType === "none"
          ? null
          : formatPenalty(penaltyType, duration || "0")

      await updateOriginalMessage(
        interaction,
        reportId,
        true,
        moderatorComment,
        penaltyDisplay,
      )

      Logger.info(`Report ${reportId} validated with penalty`, {
        moderatorComment,
        penaltyType,
        duration,
      })
    } catch (error) {
      Logger.error("Error validating report with penalty", { error, reportId })
      // Try to update original message with error state
      try {
        await updateOriginalMessage(
          interaction,
          reportId,
          true,
          "Error occurred during processing",
          "❌ Processing Error",
        )
      } catch (updateError) {
        Logger.error("Failed to update message with error state:", {
          updateError,
        })
      }
    }
  },
}

/**
 * Select menu handlers for report feature
 */
const selectHandlers = {
  async penalty_type(interaction: StringSelectMenuInteraction): Promise<void> {
    const { reportId } = parseReportCustomId(interaction.customId)
    const penaltyType = interaction.values[0]

    if (penaltyType === "none" || penaltyType === "ban") {
      // No duration needed, show modal directly
      await showPenaltyModal(interaction, reportId, penaltyType)
      return
    }

    // Show duration selection for other penalty types
    const durationSelect = new StringSelectMenuBuilder()
      .setCustomId(`report:penalty_duration:${reportId}:${penaltyType}`)
      .setPlaceholder("Select duration")

    switch (penaltyType) {
      case "leavebuster":
        durationSelect.addOptions([
          {
            label: "Level 1 (1x 10s)",
            value: "1",
            description: "First offense",
          },
          {
            label: "Level 2 (5x 30s)",
            value: "2",
            description: "Second offense",
          },
          {
            label: "Level 3 (5x 1min)",
            value: "3",
            description: "Third offense",
          },
          {
            label: "Level 4 (5x 3min)",
            value: "4",
            description: "Fourth offense",
          },
          {
            label: "Level 5 (5x 5min)",
            value: "5",
            description: "Maximum level",
          },
        ])
        break

      case "chat_restrict":
        durationSelect.addOptions([
          { label: "1 hour", value: "60" },
          { label: "6 hours", value: "360" },
          { label: "24 hours", value: "1440" },
          { label: "48 hours", value: "2880" },
          { label: "1 week", value: "10080" },
          { label: "2 weeks", value: "20160" },
          { label: "1 month", value: "43200" },
        ])
        break

      case "tempban":
        durationSelect.addOptions([
          { label: "1 day", value: "1440" },
          { label: "3 days", value: "4320" },
          { label: "7 days", value: "10080" },
          { label: "14 days", value: "20160" },
          { label: "30 days", value: "43200" },
        ])
        break
    }

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      durationSelect,
    )

    await interaction.update({
      content: "Select penalty duration:",
      components: [row],
    })
  },

  async penalty_duration(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    const parsed = parseReportCustomId(interaction.customId)
    const reportId = parsed.reportId
    const penaltyType = parsed.params[0]
    const duration = interaction.values[0]

    if (!penaltyType) {
      throw new Error(
        `Missing penalty type in custom ID: ${interaction.customId}`,
      )
    }

    await showPenaltyModal(interaction, reportId, penaltyType, duration)
  },
}

/**
 * Helper function to show penalty modal
 */
async function showPenaltyModal(
  interaction: StringSelectMenuInteraction,
  reportId: string,
  penaltyType: string,
  duration?: string,
): Promise<void> {
  const customIdParts = [`report:penalty_modal:${reportId}:${penaltyType}`]
  if (duration) {
    customIdParts.push(duration)
  }

  const modal = new ModalBuilder()
    .setCustomId(customIdParts.join(":"))
    .setTitle("Validate Report with Penalty")

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Moderator comment")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Enter the reason for this action...")
    .setRequired(true)
    .setMaxLength(500)

  const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    reasonInput,
  )
  modal.addComponents(actionRow)

  await interaction.showModal(modal)
}

/**
 * Update the original Discord message
 */
async function updateOriginalMessage(
  interaction: ModalSubmitInteraction,
  reportId: string,
  isValid: boolean,
  reason: string,
  penalty?: string | null,
): Promise<void> {
  try {
    const originalMessage = interaction.message
    if (!originalMessage) return

    const embed = originalMessage.embeds[0]
    if (!embed) return

    const status = isValid ? "✅ VALIDATED" : "❌ DISMISSED"
    const statusColor = isValid ? 0x00ff00 : 0xff0000 // Green for validated, red for dismissed
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })

    let actionValue = `${status}\n**Reason:** ${reason}`
    if (penalty) {
      actionValue += `\n**Penalty Applied:** ${penalty}`
    } else if (isValid) {
      actionValue += `\n**Penalty Applied:** None (Warning only)`
    }
    actionValue += `\n**Processed:** ${timestamp}`
    actionValue += `\n**Moderator:** ${interaction.user.tag}`

    const updatedEmbed = EmbedBuilder.from(embed)
      .setColor(statusColor)
      .addFields({
        name: "🛡️ Moderation Decision",
        value: actionValue,
        inline: false,
      })
      .setFooter({
        text: `Report #${reportId} • Processed by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })

    await originalMessage.edit({
      embeds: [updatedEmbed],
      components: [],
    })

    // If interaction was deferred, we need to acknowledge it
    if (interaction.deferred) {
      await interaction.deleteReply()
    }
  } catch (error) {
    Logger.error("Error updating original message:", { error, reportId })

    // If we failed to update but interaction is deferred, still acknowledge it
    if (interaction.deferred && !interaction.replied) {
      try {
        await interaction.editReply({ content: "❌ Error processing report" })
      } catch (replyError) {
        Logger.error("Failed to acknowledge deferred interaction:", {
          replyError,
        })
      }
    }
  }
}

/**
 * Format penalty for display
 */
function formatPenalty(type: string, duration: string): string {
  switch (type) {
    case "leavebuster":
      return `Leavebuster Level ${duration}`
    case "chat_restrict": {
      const hours = Number(duration) / 60
      return `Chat restricted for ${hours} hour${hours === 1 ? "" : "s"}`
    }
    case "tempban": {
      const days = Number(duration) / 1440
      return `Banned for ${days} day${days === 1 ? "" : "s"}`
    }
    case "ban":
      return "Permanently banned"
    default:
      return "Unknown penalty"
  }
}

/**
 * Export the report interaction handler
 */
export const reportHandler: InteractionHandler = {
  buttons: buttonHandlers,
  modals: modalHandlers,
  selects: selectHandlers,
}
