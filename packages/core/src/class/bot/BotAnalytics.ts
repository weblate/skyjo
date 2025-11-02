import type { ColumnOpportunity, Position } from "@/types/bot.js"
import type { GameToJson } from "@/types/game.js"
import type { PlayerToJson } from "@/types/player.js"
import type { SettingsToJson } from "@/types/settings.js"
import type { GameState } from "./types.js"

/**
 * Utility class for bot game state analysis
 *
 * Provides pure static methods for analyzing game state, calculating scores,
 * finding opportunities, and selecting positions. All methods are stateless
 * and can be tested in isolation.
 */
export class BotAnalytics {
  private static readonly GAME_STATE_BASE_WINNING_THRESHOLD = -5
  private static readonly GAME_STATE_BASE_LOSING_THRESHOLD = 5
  private static readonly GAME_STATE_UNCERTAINTY_FACTOR = 0.5
  private static readonly GAME_STATE_MAX_UNCERTAINTY = 5

  /**
   * Get bot player from game state
   *
   * @param gameJson - The current game state
   * @param botPlayerId - The bot player's ID
   * @returns The bot player object
   * @throws Error if bot player not found
   */
  static getBotPlayer(gameJson: GameToJson, botPlayerId: string): PlayerToJson {
    const player = gameJson.players.find((p) => p.id === botPlayerId)
    if (!player) {
      throw new Error(`Bot player ${botPlayerId} not found in game`)
    }
    return player
  }

  /**
   * Get all hidden card positions for a player
   *
   * @param player - The player to analyze
   * @returns Array of positions with hidden cards
   */
  static getHiddenCardPositions(player: PlayerToJson): Position[] {
    const positions: Position[] = []
    player.cards.forEach((column, col) => {
      column.forEach((card, row) => {
        if (!card.isVisible) {
          positions.push({ row, col })
        }
      })
    })
    return positions
  }

  /**
   * Calculate visible score for a player
   *
   * @param player - The player to calculate score for
   * @returns Sum of all visible card values
   */
  static calculateVisibleScore(player: PlayerToJson): number {
    let score = 0
    player.cards.forEach((column) => {
      column.forEach((card) => {
        if (card.isVisible && card.value !== undefined) {
          score += card.value
        }
      })
    })
    return score
  }

  /**
   * Get the lowest visible score among all opponents
   *
   * @param gameJson - The current game state
   * @param botPlayerId - The bot player's ID (to exclude from opponents)
   * @returns Lowest opponent visible score, or MAX_SAFE_INTEGER if no opponents
   */
  static getOpponentsLowestVisibleScore(
    gameJson: GameToJson,
    botPlayerId: string,
  ): number {
    const opponents = gameJson.players.filter((p) => p.id !== botPlayerId)
    if (opponents.length === 0) return Number.MAX_SAFE_INTEGER

    return Math.min(...opponents.map((p) => this.calculateVisibleScore(p)))
  }

  /**
   * Count hidden cards for a player
   *
   * @param player - The player to count hidden cards for
   * @returns Number of hidden cards
   */
  static countHiddenCards(player: PlayerToJson): number {
    return this.getHiddenCardPositions(player).length
  }

  /**
   * Find columns that could be completed with matching cards
   *
   * A column opportunity exists when:
   * - removeIdenticalColumn setting is enabled
   * - Column has at least 1 visible card and at least 1 hidden card
   * - All visible cards in the column have the same value
   *
   * This helps the bot identify strategic opportunities to complete columns,
   * which removes all cards in that column from the score (huge benefit).
   *
   * @param player - The player's card grid
   * @param settings - Game settings (checks removeIdenticalColumn)
   * @returns Array of column opportunities with matching value and hidden positions
   */
  static findColumnOpportunities(
    player: PlayerToJson,
    settings: SettingsToJson,
  ): ColumnOpportunity[] {
    if (!settings.removeIdenticalColumn) return []

    const opportunities: ColumnOpportunity[] = []

    player.cards.forEach((column, colIndex) => {
      // Count visible cards and their values
      const visibleCards = column.filter((card) => card.isVisible)
      const hiddenCards = column.filter((card) => !card.isVisible)

      if (visibleCards.length === 0 || hiddenCards.length === 0) return

      // Check if visible cards match
      const firstCard = visibleCards[0]
      if (firstCard.value === undefined) return
      const firstValue = firstCard.value
      const allMatch = visibleCards.every(
        (card) => card.value !== undefined && card.value === firstValue,
      )

      if (allMatch && visibleCards.length >= 1) {
        // Map hidden card positions by finding their actual row indices
        const hiddenPositions: Position[] = []
        column.forEach((card, row) => {
          if (!card.isVisible) {
            hiddenPositions.push({ row, col: colIndex })
          }
        })

        opportunities.push({
          colIndex,
          matchingValue: firstValue,
          matchCount: visibleCards.length,
          hiddenPositions,
        })
      }
    })

    return opportunities
  }

  /**
   * Assess current game state to determine strategy
   *
   * Compares bot's estimated total score against the best opponent's estimated score.
   * Uses visible scores + (hidden cards × expected card value) for estimation.
   *
   * Returns:
   * - 'winning': Bot is ahead by at least 5 points (adjusted for uncertainty)
   * - 'losing': Bot is behind by at least 5 points (adjusted for uncertainty)
   * - 'close': Score difference is within the threshold range
   *
   * Uncertainty adjustment: More hidden cards = wider "close" range.
   * This prevents overconfidence when many cards are still unknown.
   * Base thresholds: -5 (winning) and +5 (losing), adjusted by ±0.5 per hidden card.
   *
   * @param gameJson - The current game state
   * @param botPlayerId - The bot player's ID
   * @param expectedCardValue - Expected value of unknown cards
   * @returns 'winning', 'losing', or 'close' based on estimated score comparison
   */
  static assessGameState(
    gameJson: GameToJson,
    botPlayerId: string,
    expectedCardValue: number,
  ): GameState {
    const botPlayer = this.getBotPlayer(gameJson, botPlayerId)
    const botVisibleScore = this.calculateVisibleScore(botPlayer)
    const botHiddenCount = this.countHiddenCards(botPlayer)

    // Find opponent with lowest estimated score
    const opponents = gameJson.players.filter((p) => p.id !== botPlayerId)
    if (opponents.length === 0) return "close" // Solo game, no comparison

    let lowestOpponentEstimate = Number.MAX_SAFE_INTEGER
    let lowestOpponentUncertainty = 0

    for (const opponent of opponents) {
      const oppVisibleScore = this.calculateVisibleScore(opponent)
      const oppHiddenCount = this.countHiddenCards(opponent)

      // Estimate total score = visible + (hidden * expected)
      const oppEstimate = oppVisibleScore + oppHiddenCount * expectedCardValue

      if (oppEstimate < lowestOpponentEstimate) {
        lowestOpponentEstimate = oppEstimate
        lowestOpponentUncertainty = oppHiddenCount
      }
    }

    // Estimate bot's total score
    const botEstimate = botVisibleScore + botHiddenCount * expectedCardValue

    // Calculate score difference with estimates
    const diff = botEstimate - lowestOpponentEstimate

    // Adjust thresholds based on uncertainty (hidden card count)
    const totalUncertainty = botHiddenCount + lowestOpponentUncertainty

    // More uncertainty = wider "close" range, be more cautious
    // Base thresholds: -5 (winning) and +5 (losing)
    // Adjust by uncertainty: each hidden card adds ~0.5 to threshold
    const uncertaintyFactor = Math.min(
      totalUncertainty * BotAnalytics.GAME_STATE_UNCERTAINTY_FACTOR,
      BotAnalytics.GAME_STATE_MAX_UNCERTAINTY,
    ) // Cap at +5
    const winningThreshold =
      BotAnalytics.GAME_STATE_BASE_WINNING_THRESHOLD - uncertaintyFactor
    const losingThreshold =
      BotAnalytics.GAME_STATE_BASE_LOSING_THRESHOLD + uncertaintyFactor

    if (diff <= winningThreshold) return "winning"
    if (diff >= losingThreshold) return "losing"
    return "close"
  }

  /**
   * Shuffle array using Fisher-Yates algorithm and return first `count` elements
   *
   * Fisher-Yates shuffle is O(n) and produces uniform random distribution.
   * Only shuffles as many elements as needed (not the entire array), optimizing
   * for cases where count << array.length.
   *
   * @param positions - Array of positions to shuffle
   * @param count - Number of elements to return
   * @returns Array of randomly selected positions
   */
  static selectRandomPositions(
    positions: Position[],
    count: number,
  ): Position[] {
    const shuffled = [...positions]
    const n = shuffled.length
    const limit = Math.min(count, n)

    // Fisher-Yates shuffle (only shuffle what we need)
    for (let i = 0; i < limit; i++) {
      const j = i + Math.floor(Math.random() * (n - i))
      // Swap elements
      const temp = shuffled[i]
      shuffled[i] = shuffled[j]
      shuffled[j] = temp
    }

    return shuffled.slice(0, limit)
  }

  /**
   * Find rows that could be completed with matching cards
   *
   * A row opportunity exists when:
   * - removeIdenticalRow setting is enabled
   * - Row has at least 1 visible card and at least 1 hidden card
   * - All visible cards in the row have the same value
   *
   * @param player - The player's card grid
   * @param settings - Game settings (checks removeIdenticalRow)
   * @returns Array of row opportunities with matching value and hidden positions
   */
  static findRowOpportunities(
    player: PlayerToJson,
    settings: SettingsToJson,
  ): import("@/types/bot.js").RowOpportunity[] {
    if (!settings.removeIdenticalRow) return []

    const opportunities: import("@/types/bot.js").RowOpportunity[] = []

    if (player.cards.length === 0 || player.cards[0].length === 0) return []

    // Iterate through each row
    for (let rowIndex = 0; rowIndex < player.cards[0].length; rowIndex++) {
      // Extract all cards in this row
      const row = player.cards.map((column) => column[rowIndex])

      const visibleCards = row.filter((card) => card.isVisible)
      const hiddenCards = row.filter((card) => !card.isVisible)

      if (visibleCards.length === 0 || hiddenCards.length === 0) continue

      // Check if visible cards match
      const firstCard = visibleCards[0]
      if (firstCard.value === undefined) continue
      const firstValue = firstCard.value
      const allMatch = visibleCards.every(
        (card) => card.value !== undefined && card.value === firstValue,
      )

      if (allMatch && visibleCards.length >= 1) {
        // Map hidden card positions
        const hiddenPositions: Position[] = []
        player.cards.forEach((column, colIndex) => {
          const card = column[rowIndex]
          if (!card.isVisible) {
            hiddenPositions.push({ row: rowIndex, col: colIndex })
          }
        })

        opportunities.push({
          rowIndex,
          matchingValue: firstValue,
          matchCount: visibleCards.length,
          hiddenPositions,
        })
      }
    }

    return opportunities
  }

  /**
   * Find all 2-card patterns (columns or rows) where one card is hidden
   *
   * Used by P3 priority to identify opportunities to progress toward completion.
   * Returns patterns where:
   * - Exactly 2 visible cards match
   * - Exactly 1 hidden card remains
   * - Would complete the pattern if hidden card matches
   *
   * @param player - The player's card grid
   * @param settings - Game settings (checks removeIdenticalColumn/Row)
   * @returns Array of pattern matches with type, index, value, and hidden position
   */
  static find2CardMatches(
    player: PlayerToJson,
    settings: SettingsToJson,
  ): import("@/types/bot.js").PatternMatch[] {
    const matches: import("@/types/bot.js").PatternMatch[] = []

    // Check columns
    if (settings.removeIdenticalColumn) {
      player.cards.forEach((column, colIndex) => {
        const visible = column.filter(
          (c) => c.isVisible && c.value !== undefined,
        )
        const hidden = column.filter((c) => !c.isVisible)

        if (visible.length === 2 && hidden.length === 1) {
          const firstValue = visible[0].value
          if (firstValue !== undefined && visible[1].value === firstValue) {
            // Find hidden position
            const hiddenRowIndex = column.findIndex((c) => !c.isVisible)
            if (hiddenRowIndex !== -1) {
              matches.push({
                type: "column",
                index: colIndex,
                value: firstValue,
                hiddenPosition: { row: hiddenRowIndex, col: colIndex },
              })
            }
          }
        }
      })
    }

    // Check rows
    if (settings.removeIdenticalRow) {
      if (player.cards.length === 0 || player.cards[0].length === 0)
        return matches

      for (let rowIndex = 0; rowIndex < player.cards[0].length; rowIndex++) {
        const row = player.cards.map((column) => column[rowIndex])
        const visible = row.filter((c) => c.isVisible && c.value !== undefined)
        const hidden = row.filter((c) => !c.isVisible)

        if (visible.length === 2 && hidden.length === 1) {
          const firstValue = visible[0].value
          if (firstValue !== undefined && visible[1].value === firstValue) {
            // Find hidden position
            const hiddenColIndex = player.cards.findIndex(
              (column) => !column[rowIndex].isVisible,
            )
            if (hiddenColIndex !== -1) {
              matches.push({
                type: "row",
                index: rowIndex,
                value: firstValue,
                hiddenPosition: { row: rowIndex, col: hiddenColIndex },
              })
            }
          }
        }
      }
    }

    return matches
  }

  /**
   * Check if game is in end-game state
   *
   * End-game is when ANY opponent has ≤2 hidden cards remaining.
   * This triggers more aggressive point reduction strategies (P2).
   *
   * @param gameJson - The current game state
   * @param botPlayerId - The bot player's ID
   * @returns True if any opponent has ≤2 hidden cards
   */
  static isEndGameState(gameJson: GameToJson, botPlayerId: string): boolean {
    const opponents = gameJson.players.filter((p) => p.id !== botPlayerId)

    return opponents.some((opponent) => {
      const hiddenCount = this.countHiddenCards(opponent)
      return hiddenCount <= 2
    })
  }

  /**
   * Check if game is in early-game state
   *
   * Early-game is when ALL opponents have >2 hidden cards.
   * This enables column/row building strategies (P3, P4).
   *
   * @param gameJson - The current game state
   * @param botPlayerId - The bot player's ID
   * @returns True if all opponents have >2 hidden cards
   */
  static isEarlyGameState(gameJson: GameToJson, botPlayerId: string): boolean {
    return !this.isEndGameState(gameJson, botPlayerId)
  }
}
