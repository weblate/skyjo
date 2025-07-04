import { Logger } from "@skymo/logger"
import {
  ActionRowBuilder,
  type ButtonInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"

export async function handleButtonInteraction(
  interaction: ButtonInteraction,
): Promise<void> {
  const { customId } = interaction

  if (customId.startsWith("report_dismiss_")) {
    await handleReportDismiss(interaction)
  } else if (customId.startsWith("report_valid_")) {
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
    .setCustomId(`report_dismiss_modal_${reportId}`)
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

  const modal = new ModalBuilder()
    .setCustomId(`report_valid_modal_${reportId}`)
    .setTitle("Validate Report")

  const reasonInput = new TextInputBuilder()
    .setCustomId("reason")
    .setLabel("Reason for validation")
    .setStyle(TextInputStyle.Paragraph)
    .setPlaceholder("Enter the reason for validating this report...")
    .setRequired(true)
    .setMaxLength(500)

  const actionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    reasonInput,
  )
  modal.addComponents(actionRow)

  await interaction.showModal(modal)
}

function extractReportId(customId: string): string {
  const match = new RegExp(/report_(?:dismiss|valid)_(\d+)/).exec(customId)
  if (!match?.[1]) {
    throw new Error(`Invalid custom ID format: ${customId}`)
  }
  return match[1]
}
