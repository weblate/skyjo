import { Logger } from "@skymo/logger"
import type {
  ButtonInteraction,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js"

export interface InteractionHandler {
  buttons?: Record<string, (interaction: ButtonInteraction) => Promise<void>>
  modals?: Record<
    string,
    (interaction: ModalSubmitInteraction) => Promise<void>
  >
  selects?: Record<
    string,
    (interaction: StringSelectMenuInteraction) => Promise<void>
  >
}

export class InteractionRouter {
  private static instance: InteractionRouter | null = null
  private handlers: Map<string, InteractionHandler> = new Map()

  private constructor() {}

  public static getInstance(): InteractionRouter {
    InteractionRouter.instance ??= new InteractionRouter()
    return InteractionRouter.instance
  }

  /**
   * Register a feature module with its interaction handlers
   * @param featureName - Name of the feature (e.g., "report", "settings")
   * @param handler - Object containing button, modal, and select handlers
   */
  public registerFeature(
    featureName: string,
    handler: InteractionHandler,
  ): void {
    this.handlers.set(featureName, handler)
    Logger.info(`Registered feature: ${featureName}`, {
      hasButtons: !!handler.buttons,
      hasModals: !!handler.modals,
      hasSelects: !!handler.selects,
    })
  }

  /**
   * Route a button interaction to the appropriate handler
   */
  public async routeButton(interaction: ButtonInteraction): Promise<void> {
    const { customId } = interaction
    const [feature, action] = customId.split(":")

    if (!feature || !action) {
      Logger.warn("Invalid customId format - missing feature or action", {
        customId,
        feature,
        action,
      })
      return
    }

    const handler = this.handlers.get(feature)
    if (!handler?.buttons?.[action]) {
      Logger.warn("No button handler found", {
        feature,
        action,
        customId,
        availableActions: Object.keys(handler?.buttons || {}),
      })
      return
    }

    await handler.buttons[action](interaction)
  }

  /**
   * Route a modal interaction to the appropriate handler
   */
  public async routeModal(interaction: ModalSubmitInteraction): Promise<void> {
    const { customId } = interaction
    const [feature, action] = customId.split(":")

    if (!feature || !action) {
      Logger.warn("Invalid customId format - missing feature or action", {
        customId,
        feature,
        action,
      })
      return
    }

    const handler = this.handlers.get(feature)
    if (!handler?.modals?.[action]) {
      Logger.warn("No modal handler found", {
        feature,
        action,
        customId,
        availableActions: Object.keys(handler?.modals || {}),
      })
      return
    }

    await handler.modals[action](interaction)
  }

  /**
   * Route a select menu interaction to the appropriate handler
   */
  public async routeSelect(
    interaction: StringSelectMenuInteraction,
  ): Promise<void> {
    const { customId } = interaction
    const [feature, action] = customId.split(":")

    if (!feature || !action) {
      Logger.warn("Invalid customId format - missing feature or action", {
        customId,
        feature,
        action,
      })
      return
    }

    const handler = this.handlers.get(feature)
    if (!handler?.selects?.[action]) {
      Logger.warn("No select handler found", {
        feature,
        action,
        customId,
        availableActions: Object.keys(handler?.selects || {}),
      })
      return
    }

    await handler.selects[action](interaction)
  }

  /**
   * Check if an interaction should be deferred
   * Each feature can define its own deferral rules
   */
  public shouldDeferInteraction(
    customId: string,
    type: "button" | "modal" | "select",
  ): boolean {
    const [feature] = customId.split(":")
    if (!feature) return false

    // Default deferral rules
    const defaultRules: Record<string, boolean> = {
      modal: true, // Modal submissions usually involve DB operations
      button: false, // Buttons often show modals or update messages
      select: false, // Select menus often show modals or update messages
    }

    // Feature-specific rules can be added here
    const featureRules: Record<string, Record<string, boolean>> = {
      report: {
        modal: true,
        button: false,
        select: false,
      },
      // Add more features here as needed
    }

    return featureRules[feature]?.[type] ?? defaultRules[type] ?? false
  }
}
