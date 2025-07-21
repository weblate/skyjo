import { reportTable } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import { EmbedBuilder, type ModalSubmitInteraction } from "discord.js"
import { eq } from "drizzle-orm"
import { ApiClient } from "../api.js"
import { db } from "../database.js"

export async function handleModalInteraction(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const { customId } = interaction

  if (customId.startsWith("invalid_report_modal_")) {
    await handleReportDismissModal(interaction)
  } else if (customId.startsWith("valid_report_modal_")) {
    await handleReportValidModal(interaction)
  } else {
    Logger.warn("Unknown modal interaction:", { customId })
  }
}

async function handleReportDismissModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const reportId = extractReportId(interaction.customId)
  const reason = interaction.fields.getTextInputValue("reason")

  try {
    await interaction.deferReply({ ephemeral: true })

    const [report] = await db
      .select()
      .from(reportTable)
      .where(eq(reportTable.id, parseInt(reportId)))
      .limit(1)

    if (!report) {
      await interaction.editReply({
        content: "❌ Report not found.",
      })
      return
    }

    if (report.userId === null) {
      await db.delete(reportTable).where(eq(reportTable.id, parseInt(reportId)))
      Logger.info(`Deleted report record for anonymous user`, { reportId })
    } else {
      await db
        .update(reportTable)
        .set({
          humanValidation: false,
          reasonByMod: reason,
        })
        .where(eq(reportTable.id, parseInt(reportId)))
      Logger.info(`Updated report record with dismissal`, {
        reportId,
        userId: report.userId,
      })
    }

    await updateOriginalMessage(interaction, reportId, false, reason)

    await interaction.editReply({
      content: "✅ Report dismissed successfully.",
    })

    Logger.info(`Report ${reportId} dismissed by moderator`, { reason })
  } catch (error) {
    Logger.error("Error dismissing report:", { error, reportId })
    await interaction.editReply({
      content: "❌ An error occurred while dismissing the report.",
    })
  }
}

async function handleReportValidModal(
  interaction: ModalSubmitInteraction,
): Promise<void> {
  const reportId = extractReportId(interaction.customId)
  const reason = interaction.fields.getTextInputValue("reason")

  try {
    await interaction.deferReply({ ephemeral: true })

    const [report] = await db
      .select()
      .from(reportTable)
      .where(eq(reportTable.id, parseInt(reportId)))
      .limit(1)

    if (!report) {
      await interaction.editReply({
        content: "❌ Report not found.",
      })
      return
    }

    if (report.userId === null) {
      await db.delete(reportTable).where(eq(reportTable.id, parseInt(reportId)))
      Logger.info(`Deleted report record for anonymous user`, { reportId })
    } else {
      await db
        .update(reportTable)
        .set({
          humanValidation: true,
          reasonByMod: reason,
        })
        .where(eq(reportTable.id, parseInt(reportId)))
      Logger.info(`Updated report record with validation`, {
        reportId,
        userId: report.userId,
      })

      const gameCode = report.reportData.gameCode
      const reportedPlayerName = report.reportData.reportedPlayerName

      try {
        const apiClient = ApiClient.getInstance()
        const gameStatus = await apiClient.checkGameStatus(gameCode)

        if (gameStatus.isActive && gameStatus.hasPlayer) {
          await apiClient.kickPlayer(gameCode, reportedPlayerName)
          Logger.info(
            `Player ${reportedPlayerName} kicked from active game ${gameCode}`,
          )
        } else {
          Logger.info(
            `Game ${gameCode} is not active or player not found, skipping kick`,
          )
        }
      } catch (error) {
        Logger.error("Error kicking player:", {
          error,
          gameCode,
          reportedPlayerName,
        })
      }
    }

    await updateOriginalMessage(interaction, reportId, true, reason)

    await interaction.editReply({
      content: "✅ Report validated successfully. Player has been penalized.",
    })

    Logger.info(`Report ${reportId} validated by moderator`, { reason })
  } catch (error) {
    Logger.error("Error validating report:", { error, reportId })
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
): Promise<void> {
  try {
    const originalMessage = interaction.message
    if (!originalMessage) return

    const embed = originalMessage.embeds[0]
    if (!embed) return

    const updatedEmbed = EmbedBuilder.from(embed)
      .setColor(isValid ? 0xff0000 : 0x808080)
      .addFields({
        name: "🔧 Moderation Action",
        value: `**${isValid ? "VALIDATED" : "DISMISSED"}**\nReason: ${reason}`,
        inline: false,
      })
      .setFooter({
        text: `Action taken by ${interaction.user.tag}`,
      })

    await originalMessage.edit({
      embeds: [updatedEmbed],
    })
  } catch (error) {
    Logger.error("Error updating original message:", { error, reportId })
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
