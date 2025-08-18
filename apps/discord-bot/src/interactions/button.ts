import { Logger } from "@skymo/logger"
import {
  ActionRowBuilder,
  type ButtonInteraction,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"

export async function handleButtonInteraction(
  interaction: ButtonInteraction,
): Promise<void> {
  const { customId } = interaction

  if (customId.startsWith("invalid_report_")) {
    await handleReportDismiss(interaction)
  } else if (customId.startsWith("valid_report_")) {
    await handleReportValid(interaction)
  } else {
    Logger.warn("Unknown button interaction:", { customId })
  }
}

async function handleReportDismiss(
  interaction: ButtonInteraction,
): Promise<void> {
  const reportId = extractReportId(interaction.customId)

  const modal = new ModalBuilder()
    .setCustomId(`invalid_report_modal_${reportId}`)
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
}

async function handleReportValid(
  interaction: ButtonInteraction,
): Promise<void> {
  const reportId = extractReportId(interaction.customId)

  // Show penalty type selection menu
  const penaltyTypeSelect = new StringSelectMenuBuilder()
    .setCustomId(`penalty_type_${reportId}`)
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

  await interaction.reply({
    content: "Select a penalty to apply:",
    components: [row],
    ephemeral: true,
  })
}

function extractReportId(customId: string): string {
  const match = new RegExp(/(?:invalid|valid)_report_(\d+)/).exec(customId)
  if (!match?.[1]) {
    throw new Error(`Invalid custom ID format: ${customId}`)
  }
  return match[1]
}
