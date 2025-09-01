import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import type {
  ReportJobData,
  ReportJobGameContextMessage,
} from "@skymo/worker-types"
import dayjs from "dayjs"
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  TextChannel,
  ThreadChannel,
} from "discord.js"
import { DiscordClient } from "@/discord.js"

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

    const message = await (channel as TextChannel).send({
      embeds: [embed],
      components: [actionRow],
    })

    // Create a thread for full context
    const thread = await message.startThread({
      name: `Report #${reportData.reportId} - Full Context`,
      autoArchiveDuration: 1440, // 24 hours
    })

    // Post full context in the thread
    await postFullContextInThread(thread, reportData)

    Logger.info(`Report #${reportData.reportId} sent to Discord with thread`)
  } catch (error) {
    Logger.error("Failed to send Discord report message:", { error })
    throw error
  }
}

function createReportEmbed(reportData: ReportJobData): EmbedBuilder {
  const fields = [
    { name: "🎮 Game", value: reportData.gameCode, inline: false },
    {
      name: "🌍 Game Type",
      value: reportData.isPrivateGame ? "Private" : "Public",
      inline: false,
    },
    {
      name: "🧑‍⚖️ Reporter",
      value: reportData.reporterName,
      inline: false,
    },
    {
      name: "🕵️ Reported",
      value: reportData.reportedPlayerName,
      inline: false,
    },
    {
      name: "🔒 Has account",
      value: reportData.targetUserId
        ? `Yes (userID: ${reportData.targetUserId})`
        : `No (guestID: ${reportData.targetGuestId ?? "Unknown Guest ID (should not happen)"})`,
      inline: false,
    },
    {
      name: "🔍 Reason",
      value: formatReason(reportData.reason),
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

  fields.push({
    name: "🕒 Reported at",
    value: dayjs(reportData.reportedAt).format("DD/MM/YYYY HH:mm"),
    inline: false,
  })

  const embed = new EmbedBuilder()
    .setTitle(`Report #${reportData.reportId}`)
    .setDescription("Hey <@&1333090255603105833>, a new report just came in!\n")
    .setColor(0xff6b6b)
    .addFields(fields)
    .setFooter({
      text: "By accepting this report, the player will be removed from the game if it's still in progress, and a warning will be added to their record",
    })

  return embed
}

function formatReason(reason: string): string {
  const reasonMap: Record<string, string> = {
    "inappropriate-username": "🚫 Inappropriate Username",
    "toxic-behavior": "💀 Toxic Behavior",
    "spam-advertising": "📢 Spam/Advertising",
    "cheating-exploiting": "🎮 Cheating/Exploiting",
    harassment: "⚡ Harassment",
    other: "❓ Other",
  }
  return reasonMap[reason] || reason
}

async function postFullContextInThread(
  thread: ThreadChannel,
  reportData: ReportJobData,
) {
  try {
    // Post players information
    const playersInfo = reportData.gameContext.players
      .map((player) => {
        const status = getConnectionStatusText(player.connectionStatus)
        const username = player.username ? ` (${player.username})` : ""
        return `• **${player.name}**${username} - *ID: ${player.id}* - ${status}`
      })
      .join("\n")

    const playersEmbed = new EmbedBuilder()
      .setTitle("👥 Players in Game")
      .setDescription(playersInfo || "No players found")
      .setColor(0x3498db)

    await thread.send({ embeds: [playersEmbed] })

    // Post chat messages
    const messages = reportData.gameContext.messages
    if (messages.length === 0) {
      const noMessagesEmbed = new EmbedBuilder()
        .setTitle("💬 Chat Messages")
        .setDescription("No messages found in this game")
        .setColor(0x95a5a6)

      await thread.send({ embeds: [noMessagesEmbed] })
    } else {
      // Split messages into chunks to avoid Discord's message length limit
      const messageChunks = chunkMessages(messages, 1900) // Leave some room for formatting

      for (let i = 0; i < messageChunks.length; i++) {
        const chunk = messageChunks[i]
        if (!chunk) continue

        const formattedMessages = chunk
          .map((msg) => {
            const time = dayjs(msg.timestamp).format("HH:mm:ss")
            const name = msg.name || "System"
            return `[${time}] **${name}**: ${msg.message}`
          })
          .join("\n")

        const messagesEmbed = new EmbedBuilder()
          .setTitle(
            i === 0
              ? "💬 Chat Messages"
              : `💬 Chat Messages (continued ${i + 1})`,
          )
          .setDescription(formattedMessages)
          .setColor(0xe74c3c)

        await thread.send({ embeds: [messagesEmbed] })
      }
    }

    Logger.info(
      `Full context posted in thread for report #${reportData.reportId}`,
    )
  } catch (error) {
    Logger.error("Failed to post full context in thread:", { error })
  }
}

function getConnectionStatusText(status: number): string {
  // Based on CoreConstants.CONNECTION_STATUS
  switch (status) {
    case 1:
      return "🟢 Connected"
    case 2:
      return "🟡 Connecting"
    case 3:
      return "🔴 Disconnected"
    default:
      return "❓ Unknown"
  }
}

function chunkMessages(
  messages: ReportJobGameContextMessage[],
  maxLength: number,
): ReportJobGameContextMessage[][] {
  const chunks: ReportJobGameContextMessage[][] = []
  let currentChunk: ReportJobGameContextMessage[] = []
  let currentLength = 0

  for (const message of messages) {
    const messageLength = message.message.length + 50 // Account for formatting

    if (currentLength + messageLength > maxLength && currentChunk.length > 0) {
      chunks.push(currentChunk)
      currentChunk = []
      currentLength = 0
    }

    currentChunk.push(message)
    currentLength += messageLength
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk)
  }

  return chunks
}

function createReportButtons(
  reportId: number,
): ActionRowBuilder<ButtonBuilder> {
  const invalidButton = new ButtonBuilder()
    .setCustomId(`report:dismiss:${reportId}`)
    .setLabel("Invalid report")
    .setStyle(ButtonStyle.Secondary)

  const validButton = new ButtonBuilder()
    .setCustomId(`report:validate:${reportId}`)
    .setLabel("Valid report")
    .setStyle(ButtonStyle.Danger)

  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    invalidButton,
    validButton,
  )
}
