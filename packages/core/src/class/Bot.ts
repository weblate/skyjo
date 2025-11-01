import type {
  BotAction,
  BotDifficulty,
  ColumnOpportunity,
  Position,
} from "@/types/bot.js"
import type { GameToJson } from "@/types/game.js"
import type { PlayerToJson } from "@/types/player.js"
import type { SettingsToJson } from "@/types/settings.js"
import { Constants } from "../constants.js"

export class Bot {
  private difficulty: BotDifficulty

  // Card value thresholds for decision-making
  private static readonly CARD_VALUE_EXCELLENT = 2 // Cards ≤2 are excellent
  private static readonly CARD_VALUE_GOOD = 4 // Cards ≤4 are good
  private static readonly CARD_VALUE_DECENT = 7 // Cards ≤7 are decent

  // Easy bot thresholds
  private static readonly EASY_DISCARD_THRESHOLD = 4
  private static readonly EASY_DISCARD_LOSING_THRESHOLD = 5
  private static readonly EASY_DRAWN_LOSING_THRESHOLD = 7
  private static readonly EASY_DRAWN_CLOSE_THRESHOLD = 5

  // Medium bot thresholds
  private static readonly MEDIUM_DISCARD_THRESHOLD = 4
  private static readonly MEDIUM_COLUMN_THRESHOLD = 7
  private static readonly MEDIUM_DRAWN_THRESHOLD = 4
  private static readonly MEDIUM_DRAWN_CLOSE_THRESHOLD = 6

  // Hard bot thresholds
  private static readonly HARD_DISCARD_THRESHOLD = 3
  private static readonly HARD_COLUMN_LOW_VALUE_THRESHOLD = 4
  private static readonly HARD_DRAWN_THRESHOLD = 3
  private static readonly HARD_ENDGAME_HIDDEN_THRESHOLD = 4
  private static readonly HARD_DRAWN_LOSING_THRESHOLD = 5

  // Expected card values by difficulty
  private static readonly EXPECTED_VALUE_EASY = 6
  private static readonly EXPECTED_VALUE_MEDIUM = 5.5
  private static readonly EXPECTED_VALUE_HARD_MIN_DATA = 10
  private static readonly EXPECTED_VALUE_HARD_DEFAULT = 5.5
  private static readonly EXPECTED_VALUE_HARD_MAX = 7

  // Game state assessment thresholds
  private static readonly GAME_STATE_BASE_WINNING_THRESHOLD = -5
  private static readonly GAME_STATE_BASE_LOSING_THRESHOLD = 5
  private static readonly GAME_STATE_UNCERTAINTY_FACTOR = 0.5
  private static readonly GAME_STATE_MAX_UNCERTAINTY = 5

  // Column completion bonuses (Hard difficulty)
  private static readonly BONUS_NEGATIVE_COLUMN = 30
  private static readonly BONUS_VERY_LOW_COLUMN = 25 // For values 0-2
  private static readonly BONUS_LOW_COLUMN = 15 // For values 3-4
  private static readonly PENALTY_BREAK_COLUMN = 15
  private static readonly COLUMN_COMPLETION_MULTIPLIER = 2

  // Endgame thresholds
  private static readonly ENDGAME_MIN_HIDDEN_CARDS = 1
  private static readonly ENDGAME_HIDDEN_THRESHOLD = 3
  private static readonly LAST_CARD_THRESHOLD = 1

  // Initial reveal preferences (Easy difficulty)
  private static readonly EASY_CORNER_EDGE_PREFERENCE = 0.7 // 70% corners/edges

  constructor(difficulty: BotDifficulty) {
    this.difficulty = difficulty
  }

  /**
   * Play the initial reveal phase
   *
   * During the initial reveal phase, each player reveals a set number of cards
   * face-up. The bot's strategy varies by difficulty:
   * - Easy: Prefers corner and edge positions (statistically lower card values)
   * - Medium: Spreads reveals across columns to find patterns for column completion
   * - Hard: Prioritizes corners first, then spreads across columns for maximum information
   *
   * @param gameJson - The current game state as JSON
   * @param botPlayerId - The ID of the bot player
   * @param count - Number of cards to reveal (typically matches initialTurnedCount setting)
   * @returns Array of reveal actions indicating which positions to reveal
   * @throws Error if bot player is not found in game
   */
  playInitialReveal(gameJson: GameToJson, botPlayerId: string): BotAction[] {
    const botPlayer = this.getBotPlayer(gameJson, botPlayerId)
    const hiddenPositions = this.getHiddenCardPositions(botPlayer)

    const alreadyRevealedCount = botPlayer.cards
      .flat()
      .filter((card) => card.isVisible).length
    const nbCardsToReveal = Math.min(
      gameJson.settings.initialTurnedCount - alreadyRevealedCount,
      hiddenPositions.length,
    )

    // Return empty array if no cards need to be revealed
    if (nbCardsToReveal <= 0 || hiddenPositions.length === 0) {
      return []
    }

    if (this.difficulty === "easy") {
      // Easy: Prefer corners and edges (statistically lower cards)
      const cornerAndEdgePositions = hiddenPositions.filter((pos) => {
        const isCorner =
          (pos.row === 0 || pos.row === gameJson.settings.cardPerRow - 1) &&
          (pos.col === 0 || pos.col === gameJson.settings.cardPerColumn - 1)
        const isEdge =
          pos.row === 0 ||
          pos.row === gameJson.settings.cardPerRow - 1 ||
          pos.col === 0 ||
          pos.col === gameJson.settings.cardPerColumn - 1

        return isCorner || isEdge
      })

      // Mix: Some corners/edges, some random
      const selected: Position[] = []
      const preferredCount = Math.min(
        Math.ceil(nbCardsToReveal * Bot.EASY_CORNER_EDGE_PREFERENCE),
        cornerAndEdgePositions.length,
      )

      // Select from corners/edges
      const shuffledPreferred = this.selectRandomPositions(
        cornerAndEdgePositions,
        preferredCount,
      )
      selected.push(...shuffledPreferred)

      // Fill rest randomly - use Set for O(1) lookup
      const selectedSet = new Set(selected.map((p) => `${p.row},${p.col}`))
      const remaining = hiddenPositions.filter(
        (pos) => !selectedSet.has(`${pos.row},${pos.col}`),
      )
      const remainingCount = nbCardsToReveal - selected.length
      if (remainingCount > 0) {
        selected.push(...this.selectRandomPositions(remaining, remainingCount))
      }

      return selected.map((position) => ({
        type: "reveal",
        position,
      }))
    }

    if (this.difficulty === "medium") {
      // Try to reveal cards that could start columns
      return this.selectStrategicRevealPositions(
        botPlayer,
        gameJson.settings,
        nbCardsToReveal,
      ).map((position) => ({
        type: "reveal",
        position,
      }))
    }

    // Hard: Most strategic - spread across columns to find low values
    return this.selectHardRevealPositions(
      botPlayer,
      gameJson.settings,
      nbCardsToReveal,
    ).map((position) => ({
      type: "reveal",
      position,
    }))
  }

  /**
   * Get the next move/actions based on the current game state
   *
   * Returns actions for a single move based on the current turn status.
   * This method does NOT play a complete turn - it only returns actions
   * for the current game state. The caller must execute these actions
   * and continue calling this method until the turn is complete.
   *
   * Handles all possible turn statuses:
   * - CHOOSE_A_PILE: Decide whether to pick from discard or draw pile
   * - THROW_OR_REPLACE: Decide to keep or discard the drawn card
   * - REPLACE_A_CARD: Must replace a card (after picking from discard)
   * - TURN_A_CARD: Must reveal a hidden card
   *
   * The bot's decision-making varies significantly by difficulty level,
   * with harder difficulties using more sophisticated game state assessment,
   * column completion strategies, and expected value calculations.
   *
   * @param gameJson - The current game state as JSON
   * @param botPlayerId - The ID of the bot player whose turn it is
   * @returns Array of actions to perform in sequence for this move
   * @throws Error if bot player not found, invalid game state, or required values are missing
   */
  playMove(gameJson: GameToJson, botPlayerId: string): BotAction[] {
    const botPlayer = this.getBotPlayer(gameJson, botPlayerId)

    switch (gameJson.turnStatus) {
      case Constants.TURN_STATUS.CHOOSE_A_PILE:
        return this.handleChoosePile(gameJson, botPlayer)
      case Constants.TURN_STATUS.THROW_OR_REPLACE:
        return this.handleThrowOrReplace(gameJson, botPlayer)
      case Constants.TURN_STATUS.REPLACE_A_CARD:
        return this.handleReplaceCard(gameJson, botPlayer)
      case Constants.TURN_STATUS.TURN_A_CARD:
        return this.handleTurnCard(botPlayer, gameJson.settings)
      default:
        return []
    }
  }

  /**
   * Handle CHOOSE_A_PILE turn status: decide whether to pick from discard or draw
   */
  private handleChoosePile(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
  ): BotAction[] {
    if (this.shouldTakeDiscardCard(gameJson, botPlayer)) {
      const discardValue = gameJson.lastDiscardCardValue
      if (discardValue === undefined) {
        throw new Error(
          `Cannot pick from discard: lastDiscardCardValue is undefined`,
        )
      }
      const replaceAt = this.chooseBestReplacement(
        gameJson,
        botPlayer,
        discardValue,
        gameJson.settings,
      )
      return [
        {
          type: "pick-discard",
          replaceAt,
        },
      ]
    }
    return [{ type: "pick-draw" }]
  }

  /**
   * Handle THROW_OR_REPLACE turn status: decide to keep or discard drawn card
   */
  private handleThrowOrReplace(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
  ): BotAction[] {
    const drawnCard = gameJson.selectedCardValue
    if (drawnCard === null) {
      throw new Error(
        `Cannot process turn: selectedCardValue is null in THROW_OR_REPLACE state`,
      )
    }

    if (this.shouldKeepDrawnCard(gameJson, botPlayer, drawnCard)) {
      const replaceAt = this.chooseBestReplacement(
        gameJson,
        botPlayer,
        drawnCard,
        gameJson.settings,
      )
      return [
        {
          type: "replace",
          position: replaceAt,
        },
      ]
    }

    // After discarding, must reveal a card
    const turnPosition = this.chooseCardToReveal(botPlayer, gameJson.settings)
    return [
      { type: "discard" },
      {
        type: "turn",
        position: turnPosition,
      },
    ]
  }

  /**
   * Handle REPLACE_A_CARD turn status: must replace the picked discard card
   */
  private handleReplaceCard(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
  ): BotAction[] {
    const selectedValue = gameJson.selectedCardValue
    if (selectedValue === null) {
      throw new Error(
        `Cannot replace card: selectedCardValue is null in REPLACE_A_CARD state`,
      )
    }
    const replaceAt = this.chooseBestReplacement(
      gameJson,
      botPlayer,
      selectedValue,
      gameJson.settings,
    )
    return [
      {
        type: "replace",
        position: replaceAt,
      },
    ]
  }

  /**
   * Handle TURN_A_CARD turn status: must reveal a card
   */
  private handleTurnCard(
    botPlayer: PlayerToJson,
    settings: SettingsToJson,
  ): BotAction[] {
    const turnPosition = this.chooseCardToReveal(botPlayer, settings)
    return [
      {
        type: "turn",
        position: turnPosition,
      },
    ]
  }

  //#region Analysis Functions

  private getBotPlayer(
    gameJson: GameToJson,
    botPlayerId: string,
  ): PlayerToJson {
    const player = gameJson.players.find((p) => p.id === botPlayerId)
    if (!player) {
      throw new Error(`Bot player ${botPlayerId} not found in game`)
    }
    return player
  }

  /**
   * Calculate expected value of an unknown card based on game state
   *
   * Different difficulty levels use different strategies:
   * - Easy: Simple heuristic (average card value ≈ 6)
   * - Medium: Slightly pessimistic assumption (≈ 5.5)
   * - Hard: Calculates based on visible cards across all players and discard pile
   *   Uses statistical inference: if many low cards are visible, remaining cards
   *   are likely higher value (since players preferentially take low cards)
   *
   * Skyjo deck composition: -2(5x), -1(10x), 0-12(10x each) = 150 cards total
   * Average deck value ≈ 5.5 (accounting for negative cards)
   *
   * @param gameJson - The current game state
   * @param botPlayerId - Bot player ID (for context, not directly used)
   * @returns Expected value of an unknown card (used for decision-making)
   */
  private calculateExpectedCardValue(
    gameJson: GameToJson,
    botPlayerId: string,
  ): number {
    if (this.difficulty === "easy") {
      // Easy: Assume average card value (simple heuristic)
      return Bot.EXPECTED_VALUE_EASY
    }

    if (this.difficulty === "medium") {
      // Medium: Slightly pessimistic assumption
      return Bot.EXPECTED_VALUE_MEDIUM
    }

    // Hard: Calculate based on visible cards and remaining deck
    // Skyjo deck: -2(5x), -1(10x), 0-12(10x each) = 150 cards total
    const allVisibleCards: number[] = []

    // Collect all visible cards from all players
    for (const player of gameJson.players) {
      for (const column of player.cards) {
        for (const card of column) {
          if (card.isVisible && card.value !== undefined) {
            allVisibleCards.push(card.value)
          }
        }
      }
    }

    // Add discard pile
    if (gameJson.lastDiscardCardValue !== undefined) {
      allVisibleCards.push(gameJson.lastDiscardCardValue)
    }

    // Simple expected value: assume remaining cards average around 5-6
    // (slightly pessimistic since low cards are preferentially taken)
    const visibleCount = allVisibleCards.length
    if (visibleCount < Bot.EXPECTED_VALUE_HARD_MIN_DATA) {
      return Bot.EXPECTED_VALUE_HARD_DEFAULT // Not enough data
    }

    const visibleAvg =
      allVisibleCards.reduce((sum, v) => sum + v, 0) / visibleCount

    // Adjust assumption: remaining cards likely slightly higher than visible avg
    return Math.min(Bot.EXPECTED_VALUE_HARD_MAX, visibleAvg + 1)
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
   * @returns 'winning', 'losing', or 'close' based on estimated score comparison
   */
  private assessGameState(
    gameJson: GameToJson,
    botPlayerId: string,
  ): "winning" | "losing" | "close" {
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
      const expectedValue = this.calculateExpectedCardValue(
        gameJson,
        botPlayerId,
      )

      // Estimate total score = visible + (hidden * expected)
      const oppEstimate = oppVisibleScore + oppHiddenCount * expectedValue

      if (oppEstimate < lowestOpponentEstimate) {
        lowestOpponentEstimate = oppEstimate
        lowestOpponentUncertainty = oppHiddenCount
      }
    }

    // Estimate bot's total score
    const expectedValue = this.calculateExpectedCardValue(gameJson, botPlayerId)
    const botEstimate = botVisibleScore + botHiddenCount * expectedValue

    // Calculate score difference with estimates
    const diff = botEstimate - lowestOpponentEstimate

    // Adjust thresholds based on uncertainty (hidden card count)
    const totalUncertainty = botHiddenCount + lowestOpponentUncertainty

    // More uncertainty = wider "close" range, be more cautious
    // Base thresholds: -5 (winning) and +5 (losing)
    // Adjust by uncertainty: each hidden card adds ~0.5 to threshold
    const uncertaintyFactor = Math.min(
      totalUncertainty * Bot.GAME_STATE_UNCERTAINTY_FACTOR,
      Bot.GAME_STATE_MAX_UNCERTAINTY,
    ) // Cap at +5
    const winningThreshold =
      Bot.GAME_STATE_BASE_WINNING_THRESHOLD - uncertaintyFactor
    const losingThreshold =
      Bot.GAME_STATE_BASE_LOSING_THRESHOLD + uncertaintyFactor

    if (diff <= winningThreshold) return "winning"
    if (diff >= losingThreshold) return "losing"
    return "close"
  }

  private getHiddenCardPositions(player: PlayerToJson): Position[] {
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

  private calculateVisibleScore(player: PlayerToJson): number {
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

  private getOpponentsLowestVisibleScore(
    gameJson: GameToJson,
    botPlayerId: string,
  ): number {
    const opponents = gameJson.players.filter((p) => p.id !== botPlayerId)
    if (opponents.length === 0) return Number.MAX_SAFE_INTEGER

    return Math.min(...opponents.map((p) => this.calculateVisibleScore(p)))
  }

  private countHiddenCards(player: PlayerToJson): number {
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
  private findColumnOpportunities(
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
        // Fixed bug: properly map hidden card positions by finding their actual row indices
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

  //#endregion

  //#region Decision Functions

  private shouldTakeDiscardCard(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
  ): boolean {
    const discardValue = gameJson.lastDiscardCardValue
    if (discardValue === undefined) return false

    // Don't take if only 1 hidden card left (save for endgame)
    if (this.countHiddenCards(botPlayer) <= Bot.LAST_CARD_THRESHOLD)
      return false

    // Always take negative values (common across all difficulties)
    if (discardValue < 0) return true

    switch (this.difficulty) {
      case "easy":
        return this.shouldTakeDiscardCardEasy(gameJson, botPlayer, discardValue)
      case "medium":
        return this.shouldTakeDiscardCardMedium(
          gameJson,
          botPlayer,
          discardValue,
        )
      case "hard":
        return this.shouldTakeDiscardCardHard(gameJson, botPlayer, discardValue)
      default:
        return false
    }
  }

  private shouldTakeDiscardCardEasy(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    discardValue: number,
  ): boolean {
    // Easy: Take if ≤4, or ≤5 when losing badly
    if (discardValue <= Bot.EASY_DISCARD_THRESHOLD) return true

    // If losing badly, take ≤5
    const gameState = this.assessGameState(gameJson, botPlayer.id)
    if (
      gameState === "losing" &&
      discardValue <= Bot.EASY_DISCARD_LOSING_THRESHOLD
    )
      return true

    return false
  }

  private shouldTakeDiscardCardMedium(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    discardValue: number,
  ): boolean {
    // Medium: Take if ≤4, OR helps complete a good column
    if (discardValue <= Bot.MEDIUM_DISCARD_THRESHOLD) return true

    const opportunities = this.findColumnOpportunities(
      botPlayer,
      gameJson.settings,
    )

    // Only take for column if it's a reasonable value (≤7) or game state requires it
    const matchingOpp = opportunities.find(
      (opp) => opp.matchingValue === discardValue,
    )
    if (matchingOpp) {
      // Take if column value is reasonable or we're desperate
      if (discardValue <= Bot.MEDIUM_COLUMN_THRESHOLD) return true

      const gameState = this.assessGameState(gameJson, botPlayer.id)
      return gameState === "losing"
    }

    return false
  }

  private shouldTakeDiscardCardHard(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    discardValue: number,
  ): boolean {
    // Hard: Take if ≤3, OR helps complete low-value column (≤4)
    if (discardValue <= Bot.HARD_DISCARD_THRESHOLD) return true

    const opportunities = this.findColumnOpportunities(
      botPlayer,
      gameJson.settings,
    )

    // Only take for columns with value ≤4 (strategic column completion)
    const matchingOpp = opportunities.find(
      (opp) =>
        opp.matchingValue === discardValue &&
        opp.matchingValue <= Bot.HARD_COLUMN_LOW_VALUE_THRESHOLD,
    )

    if (matchingOpp) return true

    // In endgame, be more aggressive with value 4 cards
    const hiddenCount = this.countHiddenCards(botPlayer)
    if (
      hiddenCount <= Bot.ENDGAME_HIDDEN_THRESHOLD &&
      discardValue === Bot.HARD_COLUMN_LOW_VALUE_THRESHOLD
    )
      return true

    return false
  }

  private shouldKeepDrawnCard(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    drawnCard: number,
  ): boolean {
    // Always keep negative values (common across all difficulties)
    if (drawnCard < 0) return true

    switch (this.difficulty) {
      case "easy":
        return this.shouldKeepDrawnCardEasy(gameJson, botPlayer, drawnCard)
      case "medium":
        return this.shouldKeepDrawnCardMedium(gameJson, botPlayer, drawnCard)
      case "hard":
        return this.shouldKeepDrawnCardHard(gameJson, botPlayer, drawnCard)
      default:
        return false
    }
  }

  private shouldKeepDrawnCardEasy(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    drawnCard: number,
  ): boolean {
    // Easy: Keep if ≤4, or decent card when losing
    if (drawnCard <= Bot.EASY_DISCARD_THRESHOLD) return true

    const gameState = this.assessGameState(gameJson, botPlayer.id)

    // If losing, keep mediocre cards (≤7)
    if (gameState === "losing" && drawnCard <= Bot.EASY_DRAWN_LOSING_THRESHOLD)
      return true

    // If close or winning, only keep good cards (≤5)
    if (gameState === "close" && drawnCard <= Bot.EASY_DRAWN_CLOSE_THRESHOLD)
      return true

    return false
  }

  private shouldKeepDrawnCardMedium(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    drawnCard: number,
  ): boolean {
    // Medium: Keep if ≤4, OR helps build a reasonable column
    if (drawnCard <= Bot.MEDIUM_DRAWN_THRESHOLD) return true

    const opportunities = this.findColumnOpportunities(
      botPlayer,
      gameJson.settings,
    )

    const matchingOpp = opportunities.find(
      (opp) => opp.matchingValue === drawnCard,
    )
    if (matchingOpp) {
      // Keep for column only if value is reasonable (≤7)
      if (drawnCard <= Bot.MEDIUM_COLUMN_THRESHOLD) return true

      // Or if we're losing badly
      const gameState = this.assessGameState(gameJson, botPlayer.id)
      return gameState === "losing"
    }

    // Keep decent cards (≤6) if we're in a close game
    const gameState = this.assessGameState(gameJson, botPlayer.id)
    if (gameState === "close" && drawnCard <= Bot.MEDIUM_DRAWN_CLOSE_THRESHOLD)
      return true

    return false
  }

  private shouldKeepDrawnCardHard(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    drawnCard: number,
  ): boolean {
    // Hard: Advanced decision-making with probability and game state
    if (drawnCard <= Bot.HARD_DRAWN_THRESHOLD) return true

    const opportunities = this.findColumnOpportunities(
      botPlayer,
      gameJson.settings,
    )

    // Keep for low-value column opportunities (≤4)
    const matchingOpp = opportunities.find(
      (opp) =>
        opp.matchingValue === drawnCard &&
        opp.matchingValue <= Bot.HARD_COLUMN_LOW_VALUE_THRESHOLD,
    )
    if (matchingOpp) return true

    // Dynamic decision based on game state
    const gameState = this.assessGameState(gameJson, botPlayer.id)
    const hiddenCount = this.countHiddenCards(botPlayer)

    // In endgame (≤4 hidden), be more selective
    if (hiddenCount <= Bot.HARD_ENDGAME_HIDDEN_THRESHOLD) {
      // Only keep excellent cards
      return drawnCard <= Bot.CARD_VALUE_EXCELLENT
    }

    // If winning, be conservative (only keep ≤4)
    if (gameState === "winning") {
      return drawnCard <= Bot.HARD_COLUMN_LOW_VALUE_THRESHOLD
    }

    // If losing, be more aggressive (keep ≤5)
    if (gameState === "losing") {
      return drawnCard <= Bot.HARD_DRAWN_LOSING_THRESHOLD
    }

    // Close game: keep value 4
    return drawnCard === Bot.HARD_COLUMN_LOW_VALUE_THRESHOLD
  }

  private chooseBestReplacement(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    cardValue: number,
    settings: SettingsToJson,
  ): Position {
    if (this.difficulty === "easy") {
      // Easy: Prefer visible high cards, or random if new card is not good
      const visiblePositions: Array<{ pos: Position; value: number }> = []
      const hiddenPositions: Position[] = []

      botPlayer.cards.forEach((column, col) => {
        column.forEach((card, row) => {
          const pos = { row, col }
          if (card.isVisible && card.value !== undefined) {
            visiblePositions.push({ pos, value: card.value })
          } else {
            hiddenPositions.push(pos)
          }
        })
      })

      // If new card is good (≤4 or negative), replace highest visible card
      if (cardValue <= Bot.CARD_VALUE_GOOD || cardValue < 0) {
        if (visiblePositions.length > 0) {
          // Sort by value descending and pick highest
          visiblePositions.sort((a, b) => b.value - a.value)
          return visiblePositions[0].pos
        }
      }

      // Otherwise, replace randomly
      const allPositions = [
        ...visiblePositions.map((v) => v.pos),
        ...hiddenPositions,
      ]
      if (allPositions.length === 0) {
        throw new Error(
          `No valid positions available for replacement in bot player ${botPlayer.id}`,
        )
      }
      return allPositions[Math.floor(Math.random() * allPositions.length)]
    }

    // Medium/Hard: Evaluate best position
    let bestPosition: Position | null = null
    let bestScore = -Number.MAX_SAFE_INTEGER

    let hasValidPosition = false
    botPlayer.cards.forEach((column, col) => {
      column.forEach((card, row) => {
        const position = { row, col }
        const score = this.evaluateReplacement(
          gameJson,
          botPlayer,
          cardValue,
          position,
          settings,
        )

        if (score > bestScore) {
          bestScore = score
          bestPosition = position
          hasValidPosition = true
        }
      })
    })

    if (!hasValidPosition || bestPosition === null) {
      throw new Error(
        `No valid position found for replacement in bot player ${botPlayer.id}`,
      )
    }

    return bestPosition
  }

  private evaluateReplacement(
    gameJson: GameToJson,
    botPlayer: PlayerToJson,
    newCardValue: number,
    position: Position,
    settings: SettingsToJson,
  ): number {
    let score = 0

    // Validate position exists
    const column = botPlayer.cards[position.col]
    if (!column || position.row >= column.length) {
      throw new Error(
        `Invalid position: column ${position.col}, row ${position.row} does not exist`,
      )
    }

    const currentCard = column[position.row]
    const expectedValue = this.calculateExpectedCardValue(
      gameJson,
      botPlayer.id,
    )
    const currentValue = currentCard.isVisible
      ? (currentCard.value ?? expectedValue)
      : expectedValue

    // Base score: improvement in card value
    score += currentValue - newCardValue

    // Bonus for column completion
    if (settings.removeIdenticalColumn) {
      const visibleInColumn = column.filter(
        (c, r) => c.isVisible || r === position.row,
      )

      if (visibleInColumn.length === column.length) {
        // Would complete column
        const allMatch = visibleInColumn.every((c, r) => {
          const value =
            r === position.row ? newCardValue : (c.value ?? expectedValue)
          return value === newCardValue
        })

        if (allMatch) {
          // Column completion bonus - removes all cards
          const columnSum = column.length * newCardValue
          score += columnSum * Bot.COLUMN_COMPLETION_MULTIPLIER // Big bonus

          // Hard difficulty: Extra bonus for low-value columns
          if (this.difficulty === "hard") {
            if (newCardValue < 0) {
              score += Bot.BONUS_NEGATIVE_COLUMN // Huge bonus for negative columns
            } else if (newCardValue <= Bot.CARD_VALUE_EXCELLENT) {
              score += Bot.BONUS_VERY_LOW_COLUMN // Very high bonus for 0-2
            } else if (newCardValue <= Bot.CARD_VALUE_GOOD) {
              score += Bot.BONUS_LOW_COLUMN // Good bonus for 3-4
            }
          }
        }
      }
    }

    // Penalty for breaking potential column
    if (settings.removeIdenticalColumn && this.difficulty !== "easy") {
      const opportunities = this.findColumnOpportunities(botPlayer, settings)
      const thisColumnOpp = opportunities.find(
        (opp) => opp.colIndex === position.col,
      )

      if (
        thisColumnOpp &&
        currentCard.isVisible &&
        currentCard.value !== undefined &&
        currentCard.value === thisColumnOpp.matchingValue &&
        newCardValue !== thisColumnOpp.matchingValue
      ) {
        score -= Bot.PENALTY_BREAK_COLUMN // Penalty for breaking column
      }
    }

    return score
  }

  private chooseCardToReveal(
    botPlayer: PlayerToJson,
    settings: SettingsToJson,
  ): Position {
    const hiddenPositions = this.getHiddenCardPositions(botPlayer)

    if (hiddenPositions.length === 0) {
      // No hidden cards available - this should not happen in normal gameplay
      // but if it does, we need to validate the player has cards
      if (
        botPlayer.cards.length === 0 ||
        botPlayer.cards.every((col) => col.length === 0)
      ) {
        throw new Error(
          `Bot player ${botPlayer.id} has no cards to reveal or choose from`,
        )
      }
      // All cards are visible - this is an edge case where bot must reveal something
      // Return first available position (should be handled by game logic)
      for (let col = 0; col < botPlayer.cards.length; col++) {
        const column = botPlayer.cards[col]
        if (!column) continue
        for (let row = 0; row < column.length; row++) {
          return { row, col }
        }
      }
      throw new Error(
        `Bot player ${botPlayer.id} has no valid positions for card reveal`,
      )
    }

    // Check endgame protection
    if (
      hiddenPositions.length === Bot.ENDGAME_MIN_HIDDEN_CARDS &&
      this.difficulty !== "easy"
    ) {
      // Don't reveal last card unless winning significantly
      // This should not happen in normal flow, but just in case
      return hiddenPositions[0]
    }

    if (this.difficulty === "easy") {
      // Easy: Random reveal
      return hiddenPositions[Math.floor(Math.random() * hiddenPositions.length)]
    }

    // Medium/Hard: Strategic reveal
    // Prioritize cards NOT in column opportunities
    const opportunities = this.findColumnOpportunities(botPlayer, settings)
    const opportunityColumns = new Set(opportunities.map((opp) => opp.colIndex))

    const nonColumnPositions = hiddenPositions.filter(
      (pos) => !opportunityColumns.has(pos.col),
    )

    if (nonColumnPositions.length > 0) {
      // Reveal from non-column positions
      return nonColumnPositions[
        Math.floor(Math.random() * nonColumnPositions.length)
      ]
    }

    // All positions are in columns, reveal randomly
    return hiddenPositions[Math.floor(Math.random() * hiddenPositions.length)]
  }

  //#endregion

  //#region Helper Functions

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
  private selectRandomPositions(
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
   * Select strategic positions for initial reveal (Medium difficulty)
   *
   * Strategy: Reveal one card from as many different columns as possible.
   * This maximizes information gain about card values across the grid,
   * helping identify potential column completion opportunities early.
   *
   * @param botPlayer - The bot player's card grid
   * @param settings - Game settings
   * @param count - Number of cards to reveal
   * @returns Array of positions to reveal
   */
  private selectStrategicRevealPositions(
    botPlayer: PlayerToJson,
    settings: SettingsToJson,
    count: number,
  ): Position[] {
    const hiddenPositions = this.getHiddenCardPositions(botPlayer)

    // Try to reveal one card from different columns to find patterns
    const columnCounts = new Map<number, number>()
    const selected: Position[] = []

    // First pass: One from each column
    for (const pos of hiddenPositions) {
      const colCount = columnCounts.get(pos.col) || 0
      if (colCount === 0 && selected.length < count) {
        selected.push(pos)
        columnCounts.set(pos.col, 1)
      }
    }

    // Second pass: Fill remaining randomly
    const selectedSet = new Set(selected.map((p) => `${p.row},${p.col}`))
    const remaining = hiddenPositions.filter(
      (pos) => !selectedSet.has(`${pos.row},${pos.col}`),
    )
    // Use selectRandomPositions to avoid O(n) splice operations
    if (remaining.length > 0 && selected.length < count) {
      const needed = count - selected.length
      const randomSelection = this.selectRandomPositions(remaining, needed)
      selected.push(...randomSelection)
    }

    return selected
  }

  /**
   * Select strategic positions for initial reveal (Hard difficulty)
   *
   * Strategy: Prioritize corner positions (statistically lower card values),
   * then spread across columns to maximize information gain.
   * Combines statistical advantage (corners/edges) with strategic information gathering.
   *
   * @param botPlayer - The bot player's card grid
   * @param settings - Game settings (for grid dimensions)
   * @param count - Number of cards to reveal
   * @returns Array of positions to reveal
   */
  private selectHardRevealPositions(
    botPlayer: PlayerToJson,
    settings: SettingsToJson,
    count: number,
  ): Position[] {
    // Hard: Spread across columns, prefer edge positions (often lower cards)
    const hiddenPositions = this.getHiddenCardPositions(botPlayer)
    const selected: Position[] = []

    // Prioritize corner and edge positions
    const cornerPositions = hiddenPositions.filter(
      (pos) =>
        (pos.row === 0 || pos.row === settings.cardPerRow - 1) &&
        (pos.col === 0 || pos.col === settings.cardPerColumn - 1),
    )

    // Add corners first
    for (const pos of cornerPositions.slice(
      0,
      Math.min(count, cornerPositions.length),
    )) {
      selected.push(pos)
    }

    // Then spread across columns - use Set for O(1) lookup
    if (selected.length < count) {
      const columnCounts = new Map<number, number>()
      selected.forEach((pos) => columnCounts.set(pos.col, 1))

      const selectedSet = new Set(selected.map((p) => `${p.row},${p.col}`))
      const remaining = hiddenPositions.filter(
        (pos) => !selectedSet.has(`${pos.row},${pos.col}`),
      )

      for (const pos of remaining) {
        if (selected.length >= count) break

        const colCount = columnCounts.get(pos.col) || 0
        if (colCount === 0) {
          selected.push(pos)
          columnCounts.set(pos.col, 1)
        }
      }
    }

    // Fill remaining randomly - use Set for O(1) lookup
    const selectedSet = new Set(selected.map((p) => `${p.row},${p.col}`))
    const remaining = hiddenPositions.filter(
      (pos) => !selectedSet.has(`${pos.row},${pos.col}`),
    )
    // Use selectRandomPositions to avoid O(n) splice operations
    if (remaining.length > 0 && selected.length < count) {
      const needed = count - selected.length
      const randomSelection = this.selectRandomPositions(remaining, needed)
      selected.push(...randomSelection)
    }

    return selected
  }

  //#endregion
}
