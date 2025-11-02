import type { GameToJson } from "@/types/game.js"
import type { PlayerToJson } from "@/types/player.js"
import type { SettingsToJson } from "@/types/settings.js"
import type { BotAnalytics } from "./BotAnalytics.js"

/**
 * Context object passed to bot strategies for decision-making
 *
 * Provides all necessary information and utilities for a strategy to make
 * informed decisions without needing to manage state or dependencies.
 */
export interface DecisionContext {
  /** The complete game state */
  gameJson: GameToJson

  /** The bot player's data */
  botPlayer: PlayerToJson

  /** Game settings */
  settings: SettingsToJson

  /** Utility class for game state analysis */
  analytics: typeof BotAnalytics
}

/**
 * Game state assessment result
 */
export type GameState = "winning" | "losing" | "close"
