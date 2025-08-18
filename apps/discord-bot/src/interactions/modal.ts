import { reportTable } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import {
  EmbedBuilder,
  MessageFlags,
  type ModalSubmitInteraction,
} from "discord.js"
import { eq } from "drizzle-orm"
import { ApiClient } from "../api.js"
import { db } from "../database.js"

export async function handleModalInteraction(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const { customId } = interaction

  if (customId.startsWith("invalid_report_modal_")) {
    await handleInvalidReportSubmit(interaction)
  } else if (customId.startsWith("valid_report_modal_")) {
    await handleValidReportSubmit(interaction)
  } else if (customId.startsWith("penalty_modal_")) {
    await handlePenaltyModalSubmit(interaction)
  } else {
    Logger.warn("Unknown modal interaction:", { customId })
  }
}

async function handleInvalidReportSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const reportId = extractReportId(interaction.customId)
  const moderatorComment = interaction.fields.getTextInputValue("reason")

  try {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    })
    const [report] = await db
      .select()
      .from(reportTable)
      .where(eq(reportTable.id, Number(reportId)))
      .limit(1)

    if (!report) {
      await interaction.editReply({
        content: "❌ Report not found.",
      })
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

    await updateOriginalMessage(interaction, reportId, false, moderatorComment)

    await interaction.editReply({
      content: "✅ Report dismissed successfully.",
    })

    Logger.info(`Report ${reportId} dismissed by moderator`, {
      moderatorComment,
    })
  } catch (error) {
    Logger.error("Error dismissing report:", { error, reportId })
    await interaction.editReply({
      content: "❌ An error occurred while dismissing the report.",
    })
  }
}

async function handleValidReportSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const reportId = extractReportId(interaction.customId)
  const moderatorComment = interaction.fields.getTextInputValue("reason")

  try {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    })

    const [report] = await db
      .select()
      .from(reportTable)
      .where(eq(reportTable.id, Number(reportId)))
      .limit(1)

    if (!report) {
      await interaction.editReply({
        content: "❌ Report not found.",
      })
      return
    }

    if (report.userId === null) {
      await db.delete(reportTable).where(eq(reportTable.id, Number(reportId)))
      Logger.info(`Deleted report record for anonymous user`, { reportId })
    } else {
      await db
        .update(reportTable)
        .set({
          validation: true,
          moderatorComment,
        })
        .where(eq(reportTable.id, Number(reportId)))
      Logger.info(`Updated report record with validation`, {
        reportId,
        userId: report.userId,
      })
    }

    const gameCode = report.reportData.gameCode
    const reportedPlayerId = report.reportData.reportedPlayerId
    const reportedPlayerName = report.reportData.reportedPlayerName

    try {
      const apiClient = ApiClient.getInstance()
      const gameStatus = await apiClient.checkGameStatus(gameCode)

      if (gameStatus.isActive && gameStatus.hasPlayer) {
        await apiClient.kickPlayer(gameCode, reportedPlayerId)
        Logger.info(
          `Player ${reportedPlayerName} (ID: ${reportedPlayerId}) kicked from active game ${gameCode}`,
        )
      } else {
        Logger.info(
          `Game ${gameCode} is not active or player not found, skipping kick`,
        )
      }
    } catch (error) {
      Logger.error("Error kicking player", {
        error,
        gameCode,
        reportedPlayerId,
        reportedPlayerName,
      })
    }

    await updateOriginalMessage(interaction, reportId, true, moderatorComment)

    await interaction.editReply({
      content: "✅ Report validated successfully. Player has been penalized.",
    })

    Logger.info(`Report ${reportId} validated by moderator`, {
      moderatorComment,
    })
  } catch (error) {
    Logger.error("Error validating report", { error, reportId })
    await interaction.editReply({
      content: "❌ An error occurred while validating the report.",
    })
  }
}

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

    let actionValue = `**${isValid ? "VALIDATED" : "DISMISSED"}**\nReason: ${reason}`
    if (penalty) {
      actionValue += `\nPenalty: ${penalty}`
    }

    const updatedEmbed = EmbedBuilder.from(embed)
      .setColor(isValid ? 0xff0000 : 0x808080)
      .addFields({
        name: "🔧 Moderation Action",
        value: actionValue,
        inline: false,
      })
      .setFooter({
        text: `Action taken by ${interaction.user.tag}`,
      })

    await originalMessage.edit({
      embeds: [updatedEmbed],
      components: [],
    })
  } catch (error) {
    Logger.error("Error updating original message:", { error, reportId })
  }
}

async function handlePenaltyModalSubmit(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const moderatorComment = interaction.fields.getTextInputValue("reason")

  // Parse the state from customId: penalty_modal_{reportId}_{penaltyType}_{duration}
  const parts = interaction.customId.replace("penalty_modal_", "").split("_")
  const reportId = parts[0]
  const penaltyType = parts[1]
  const duration = parts[2] // Could be level for leavebuster or minutes for others

  if (!reportId || !penaltyType) {
    await interaction.reply({
      content: "❌ Invalid penalty data.",
      flags: MessageFlags.Ephemeral,
    })
    return
  }

  try {
    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    })

    const [report] = await db
      .select()
      .from(reportTable)
      .where(eq(reportTable.id, Number(reportId)))
      .limit(1)

    if (!report) {
      await interaction.editReply({
        content: "❌ Report not found.",
      })
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

    // Apply penalty if not "none"
    if (penaltyType !== "none") {
      const apiClient = ApiClient.getInstance()

      const penaltyData: {
        targetUserId?: number | null
        targetGuestId?: string | null
        type: string
        level?: number
        durationMinutes?: number
        reason: string
        reportId: number
      } = {
        targetUserId: report.userId,
        targetGuestId: report.guestId || null,
        type: penaltyType,
        reason: `Report #${reportId}: ${moderatorComment}`,
        reportId: Number(reportId),
      }

      // Add specific penalty parameters
      if (penaltyType === "leavebuster" && duration) {
        penaltyData.level = Number(duration)
      } else if (
        (penaltyType === "chat_restrict" || penaltyType === "tempban") &&
        duration
      ) {
        penaltyData.durationMinutes = Number(duration)
      }
      // ban type doesn't need duration (permanent)

      await apiClient.applyPenalty(penaltyData)

      // Kick from active game if tempban or ban
      if (penaltyType === "tempban" || penaltyType === "ban") {
        const gameCode = report.reportData.gameCode
        const reportedPlayerId = report.reportData.reportedPlayerId

        const gameStatus = await apiClient.checkGameStatus(gameCode)
        if (gameStatus.isActive && gameStatus.hasPlayer) {
          await apiClient.kickPlayer(gameCode, reportedPlayerId)
        }
      }
    }

    // Update Discord embed
    await updateOriginalMessage(
      interaction,
      reportId,
      true,
      moderatorComment,
      penaltyType !== "none"
        ? formatPenalty(penaltyType, duration || "0")
        : null,
    )

    await interaction.editReply({
      content: `✅ Report validated. ${
        penaltyType !== "none"
          ? `Penalty applied: ${formatPenalty(penaltyType, duration || "0")}`
          : "No penalty applied."
      }`,
    })

    Logger.info(`Report ${reportId} validated with penalty`, {
      moderatorComment,
      penaltyType,
      duration,
    })
  } catch (error) {
    Logger.error("Error validating report with penalty", { error, reportId })
    await interaction.editReply({
      content: "❌ An error occurred while processing the report.",
    })
  }
}

function formatPenalty(type: string, duration: string): string {
  switch (type) {
    case "leavebuster":
      return `Leavebuster Level ${duration}`
    case "chat_restrict":
      const hours = Number(duration) / 60
      return `Chat restricted for ${hours} hour${hours !== 1 ? "s" : ""}`
    case "tempban":
      const days = Number(duration) / 1440
      return `Banned for ${days} day${days !== 1 ? "s" : ""}`
    case "ban":
      return "Permanently banned"
    default:
      return "Unknown penalty"
  }
}

function extractReportId(customId: string): string {
  const match = new RegExp(/(?:invalid|valid)_report_modal_(\d+)/).exec(
    customId,
  )
  if (!match?.[1]) {
    throw new Error(`Invalid custom ID format: ${customId}`)
  }

  return match[1]
}
