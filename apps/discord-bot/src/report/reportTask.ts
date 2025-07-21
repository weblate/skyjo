import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import dayjs from "dayjs"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
} from "discord.js"
import { DiscordClient } from "@/discord.js"
import type { ReportJobData } from "../types/jobs.js"

export async function sendReportMessage(
  reportData: ReportJobData,
): Promise<void> {
  try {
    const discordClient = DiscordClient.getInstance().getClient()
    const channel = await discordClient.channels.fetch(
      ENV.DISCORD_REPORT_CHANNEL_ID,
    )

    if (!channel?.isTextBased()) {
      throw new Error(
        `Report channel ${ENV.DISCORD_REPORT_CHANNEL_ID} not found or is not a text channel`,
      )
    }

    const embed = createReportEmbed(reportData)
    const actionRow = createReportButtons(reportData.reportId)

    await (channel as TextChannel).send({
      embeds: [embed],
      components: [actionRow],
    })

    Logger.info(`Report #${reportData.reportId} sent to Discord`)
  } catch (error) {
    Logger.error("Failed to send Discord report message:", { error })
    throw error
  }
}

function createReportEmbed(reportData: ReportJobData): EmbedBuilder {
  const fields = [
    { name: "🎮 Game", value: reportData.gameCode, inline: false },
    { name: "🧑‍⚖️ Reporter", value: reportData.reporterName, inline: false },
    {
      name: "🕵️ Reported",
      value: reportData.reportedPlayerName,
      inline: false,
    },
    {
      name: "🔒 Has account",
      value: reportData.targetUserId ? "Yes" : "No",
      inline: false,
    },
    { name: "🔍 Report type", value: reportData.reportType, inline: false },
    {
      name: "📄 Content",
      value: reportData.reportedContent || "N/A",
      inline: false,
    },
  ]

  // Add comment field only if comment is provided and not empty
  if (reportData.comment && reportData.comment.trim()) {
    fields.push({
      name: "💬 Additional Context",
      value: reportData.comment,
      inline: false,
    })
  }

  fields.push(
    {
      name: "🤖 AI validation",
      value:
        reportData.aiValidation?.safe === false
          ? `**Not Safe (${reportData.aiValidation.reason})**`
          : "**Safe**",
      inline: false,
    },
    {
      name: "🕒 Reported at",
      value: dayjs(reportData.reportedAt).format("DD/MM/YYYY HH:mm"),
      inline: false,
    },
  )

  const embed = new EmbedBuilder()
    .setTitle(`Report #${reportData.reportId}`)
    .setDescription("Hey <@&1333090255603105833>, a new report just came in!")
    .setColor(0xff6b6b)
    .addFields(fields)
    .setFooter({
      text: "By accepting this report, the player will be removed from the game if it's still in progress, and a warning will be added to their record",
    })

  return embed
}

function createReportButtons(
  reportId: number,
): ActionRowBuilder<ButtonBuilder> {
  const invalidButton = new ButtonBuilder()
    .setCustomId(`invalid_report_${reportId}`)
    .setLabel("Invalid report")
    .setStyle(ButtonStyle.Secondary)

  const validButton = new ButtonBuilder()
    .setCustomId(`valid_report_${reportId}`)
    .setLabel("Valid report")
    .setStyle(ButtonStyle.Danger)

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    invalidButton,
    validButton,
  )
}
