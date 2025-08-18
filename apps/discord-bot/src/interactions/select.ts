import { Logger } from "@skymo/logger"
import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  type StringSelectMenuInteraction,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"

export async function handleSelectInteraction(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const { customId, values } = interaction

  if (customId.startsWith("penalty_type_")) {
    await handlePenaltyTypeSelection(interaction)
  } else if (customId.startsWith("penalty_duration_")) {
    await handlePenaltyDurationSelection(interaction)
  } else {
    Logger.warn("Unknown select interaction:", { customId })
  }
}

async function handlePenaltyTypeSelection(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const reportId = extractReportId(interaction.customId, "penalty_type_")
  const penaltyType = interaction.values[0]

  // Store the penalty type for later use
  const state = `${reportId}_${penaltyType}`

  if (penaltyType === "none") {
    // No penalty, go straight to moderator comment modal
    await showModeratorCommentModal(interaction, state)
    return
  }

  if (penaltyType === "ban") {
    // Permanent ban, no duration needed
    await showModeratorCommentModal(interaction, state)
    return
  }

  // Show duration selection for other penalty types
  const durationSelect = new StringSelectMenuBuilder()
    .setCustomId(`penalty_duration_${state}`)
    .setPlaceholder("Select duration")

  switch (penaltyType) {
    case "leavebuster":
      durationSelect.addOptions([
        { label: "Level 1 (1x 10s)", value: "1", description: "First offense" },
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
        { label: "30 minutes", value: "30" },
        { label: "1 hour", value: "60" },
        { label: "6 hours", value: "360" },
        { label: "24 hours", value: "1440" },
        { label: "48 hours", value: "2880" },
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
}

async function handlePenaltyDurationSelection(
  interaction: StringSelectMenuInteraction,
): Promise<void> {
  const customIdParts = interaction.customId.replace("penalty_duration_", "")
  const duration = interaction.values[0]

  // Append duration to state
  const state = `${customIdParts}_${duration}`

  await showModeratorCommentModal(interaction, state)
}

async function showModeratorCommentModal(
  interaction: StringSelectMenuInteraction,
  state: string,
): Promise<void> {
  const modal = new ModalBuilder()
    .setCustomId(`penalty_modal_${state}`)
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

function extractReportId(customId: string, prefix: string): string {
  const remaining = customId.replace(prefix, "")
  const reportId = remaining.split("_")[0]
  if (!reportId) {
    throw new Error(`Invalid custom ID format: ${customId}`)
  }
  return reportId
}
