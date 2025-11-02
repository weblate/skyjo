import type { BotAction, Position } from "@/types/bot.js"
import type { GameToJson } from "@/types/game.js"
import { Constants } from "../../constants.js"
import { BotAnalytics } from "./BotAnalytics.js"
import type { DecisionContext } from "./types.js"

/**
 * Priority-based action result
 * @internal
 */
type PriorityAction =
  | { type: "take"; position: Position } // P1-P5 matched
  | { type: "draw" } // P6: Draw from deck

/**
 * Priority-based Bot implementation
 *
 * Implements "Medium V2" bot strategy using a priority-based decision system.
 * The bot evaluates cards through a strict priority hierarchy (P1-P6) and
 * makes strategic decisions based on game state (early-game vs end-game).
 *
 * Key Features:
 * - FR1: Same-row initial reveals for row completion opportunities
 * - FR3: Priority heuristic (P1-P6) for card evaluation
 * - FR4: Post-draw logic with danger check
 * - FR5: Forbidden completion rules (negative, zero cards)
 * - FR6: "No Bad Finishes" - prevents dangerous last card reveals (unless forceFinish is enabled)
 *
 * Design:
 * - No difficulty levels - single optimized strategy
 * - Stateless methods - all decisions based on current game state
 * - Uses BotAnalytics for game state analysis
 * - Optional `forceFinish` parameter for testing/deadlock prevention
 */
export class Bot {
  /**
   * If true, bot will always finish when it has 1 hidden card, even if dangerous.
   * Useful for preventing deadlocks in simulations where all bots avoid finishing.
   */
  private readonly forceFinish: boolean

  constructor(options?: { forceFinish?: boolean }) {
    this.forceFinish = options?.forceFinish ?? false
  }
  /**
   * Play the initial reveal phase
   *
   * FR1: Reveals cards in the same row (row 0) to maximize row completion
   * opportunities. If initialTurnedCount > columns, fills first row then
   * continues to second row.
   *
   * @param gameJson - The current game state as JSON
   * @param botPlayerId - The ID of the bot player
   * @returns Array of reveal actions indicating which positions to reveal
   * @throws Error if bot player is not found in game
   */
  playInitialReveal(gameJson: GameToJson, botPlayerId: string): BotAction[] {
    const botPlayer = BotAnalytics.getBotPlayer(gameJson, botPlayerId)
    const hiddenPositions = BotAnalytics.getHiddenCardPositions(botPlayer)

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

    const context = this.buildContext(gameJson, botPlayerId)
    const positions = this.selectSameRowPositions(context, nbCardsToReveal)

    return positions.map((position) => ({
      type: "reveal",
      position,
    }))
  }

  /**
   * Get the next move based on the current game state
   *
   * Returns a single action for the current turn status.
   * Handles all possible turn statuses:
   * - CHOOSE_A_PILE: Decide whether to pick from discard or draw pile
   * - THROW_OR_REPLACE: Decide to keep or discard the drawn card
   * - REPLACE_A_CARD: Must replace a card (after picking from discard)
   * - TURN_A_CARD: Must reveal a hidden card
   *
   * @param gameJson - The current game state as JSON
   * @param botPlayerId - The ID of the bot player whose turn it is
   * @returns Single action to perform for this move
   * @throws Error if bot player not found, invalid game state, or required values are missing
   */
  playMove(gameJson: GameToJson, botPlayerId: string): BotAction {
    const context = this.buildContext(gameJson, botPlayerId)

    switch (gameJson.turnStatus) {
      case Constants.TURN_STATUS.CHOOSE_A_PILE:
        return this.handleChoosePile(context, gameJson)
      case Constants.TURN_STATUS.THROW_OR_REPLACE:
        return this.handleThrowOrReplace(context, gameJson)
      case Constants.TURN_STATUS.REPLACE_A_CARD:
        return this.handleReplaceCard(context, gameJson)
      case Constants.TURN_STATUS.TURN_A_CARD:
        return this.handleTurnCard(context)
      default:
        throw new Error(`Unknown turn status: ${gameJson.turnStatus}`)
    }
  }

  /**
   * Build decision context for strategy
   *
   * @param gameJson - Current game state
   * @param botPlayerId - Bot player ID
   * @returns Context object with all necessary data and utilities
   */
  private buildContext(
    gameJson: GameToJson,
    botPlayerId: string,
  ): DecisionContext {
    const botPlayer = BotAnalytics.getBotPlayer(gameJson, botPlayerId)

    return {
      gameJson,
      botPlayer,
      settings: gameJson.settings,
      analytics: BotAnalytics,
    }
  }

  /**
   * Handle CHOOSE_A_PILE turn status
   *
   * Evaluates discard pile card through priority heuristic (FR3).
   * Returns 'pick-discard' if any priority P1-P5 matches, otherwise 'pick-draw'.
   *
   * FR6: If bot has 1 hidden card and can safely finish, prioritize finishing
   * over all other priorities.
   */
  private handleChoosePile(
    context: DecisionContext,
    gameJson: GameToJson,
  ): BotAction {
    const discardValue = gameJson.lastDiscardCardValue
    if (discardValue === undefined) {
      throw new Error(
        "Cannot pick from discard: lastDiscardCardValue is undefined",
      )
    }

    // FR6: If bot has 1 hidden card, check if it can safely finish
    // This must be checked BEFORE priority evaluation to prevent
    // making suboptimal moves when the bot is winning
    const hiddenCount = BotAnalytics.countHiddenCards(context.botPlayer)
    if (hiddenCount === 1) {
      if (this.canSafelyFinish(context, discardValue)) {
        // Safe to finish: pick from discard and replace hidden card
        const hiddenPositions = BotAnalytics.getHiddenCardPositions(
          context.botPlayer,
        )
        if (hiddenPositions.length === 1) {
          return { type: "pick-discard", replaceAt: hiddenPositions[0] }
        }
      }
    }

    const action = this.evaluateDiscardPile(context, discardValue)

    if (action.type === "take") {
      return { type: "pick-discard", replaceAt: action.position }
    }

    return { type: "pick-draw" }
  }

  /**
   * Handle THROW_OR_REPLACE turn status
   *
   * FR4: Post-draw logic with FR6 danger check.
   * 1. Evaluate drawn card through priorities
   * 2. If good (P1-P5), replace
   * 3. If bad, check danger (FR6)
   * 4. If dangerous, force replace to avoid flip
   * 5. If safe, discard and reveal
   */
  private handleThrowOrReplace(
    context: DecisionContext,
    gameJson: GameToJson,
  ): BotAction {
    const drawnValue = gameJson.selectedCardValue
    if (drawnValue === null) {
      throw new Error(
        "Cannot process turn: selectedCardValue is null in THROW_OR_REPLACE state",
      )
    }

    // FR4: Evaluate drawn card through priority heuristic
    const action = this.evaluateDiscardPile(context, drawnValue)

    // If card passes P1-P5, check if we should finish first (when 1 hidden card)
    if (action.type === "take") {
      const hiddenCount = BotAnalytics.countHiddenCards(context.botPlayer)

      // If bot has exactly 1 hidden card and can safely finish, replace hidden instead of priority position
      if (hiddenCount === 1 && this.canSafelyFinish(context, drawnValue)) {
        const hiddenPositions = BotAnalytics.getHiddenCardPositions(
          context.botPlayer,
        )
        if (hiddenPositions.length === 1) {
          return { type: "replace", position: hiddenPositions[0] }
        }
      }

      // Otherwise, use the priority result
      return { type: "replace", position: action.position }
    }

    // Card failed all priorities (bad card) - need to decide what to do
    const hiddenCount = BotAnalytics.countHiddenCards(context.botPlayer)

    // FR6: If we have exactly 1 hidden card
    if (hiddenCount === 1) {
      // In LAST_LAP: discard bad card and reveal hidden card

      // Even if safe to finish with bad card, discard it and reveal hidden card
      // The hidden card has high probability of being ≤4, so bet on it
      // rather than locking in the bad drawn card value
      if (
        context.gameJson.roundPhase === Constants.ROUND_PHASE.LAST_LAP ||
        this.canSafelyFinish(context, drawnValue)
      ) {
        // Safe to finish, but card is bad: discard and reveal hidden (take the chance)
        // In LAST_LAP: discard bad card and reveal hidden card
        // The hidden card might be good (≤4), so it's better to take the chance
        // rather than lock in the bad drawn card value
        return { type: "discard" }
      }

      // Not LAST_LAP: replace highest visible to avoid finishing prematurely
      const fallbackPosition = this.findHighestVisibleCard(context, false)
      return { type: "replace", position: fallbackPosition }
    }

    // More than 1 hidden card: discard the bad card and reveal a hidden card
    // This is normal gameplay - we need to reveal cards to progress
    return { type: "discard" }
  }

  /**
   * Handle REPLACE_A_CARD turn status
   *
   * Card was already picked from discard pile, must replace it somewhere.
   * Uses same logic as handleThrowOrReplace: if safe to finish, replace hidden card.
   */
  private handleReplaceCard(
    context: DecisionContext,
    gameJson: GameToJson,
  ): BotAction {
    const selectedValue = gameJson.selectedCardValue
    if (selectedValue === null) {
      throw new Error(
        "Cannot replace card: selectedCardValue is null in REPLACE_A_CARD state",
      )
    }

    const action = this.evaluateDiscardPile(context, selectedValue)

    // If card passes P1-P5, check if we should finish first (when 1 hidden card)
    if (action.type === "take") {
      const hiddenCount = BotAnalytics.countHiddenCards(context.botPlayer)

      // If bot has exactly 1 hidden card and can safely finish, replace hidden instead of priority position
      if (hiddenCount === 1 && this.canSafelyFinish(context, selectedValue)) {
        const hiddenPositions = BotAnalytics.getHiddenCardPositions(
          context.botPlayer,
        )
        if (hiddenPositions.length === 1) {
          return { type: "replace", position: hiddenPositions[0] }
        }
      }

      // Otherwise, use the priority result
      return { type: "replace", position: action.position }
    }

    // Card failed all priorities (bad card) - need to decide what to do
    const hiddenCount = BotAnalytics.countHiddenCards(context.botPlayer)

    // FR6: If we have exactly 1 hidden card
    if (hiddenCount === 1) {
      // Even if safe to finish with bad card, still replace hidden to reveal it
      // The hidden card has high probability of being ≤4, so bet on it
      // rather than locking in the bad picked card value by replacing visible
      if (this.canSafelyFinish(context, selectedValue)) {
        // Safe to finish, but card is bad: replace hidden to reveal it (take the chance)
        const hiddenPositions = BotAnalytics.getHiddenCardPositions(
          context.botPlayer,
        )
        if (hiddenPositions.length === 1) {
          return { type: "replace", position: hiddenPositions[0] }
        }
      }

      if (context.gameJson.roundPhase === Constants.ROUND_PHASE.LAST_LAP) {
        // In LAST_LAP: replace hidden to reveal it (we must finish anyway)
        // The hidden card might be good (≤4), so it's better to reveal it
        // rather than lock in the bad picked card value by replacing visible
        const hiddenPositions = BotAnalytics.getHiddenCardPositions(
          context.botPlayer,
        )
        if (hiddenPositions.length === 1) {
          return { type: "replace", position: hiddenPositions[0] }
        }
      }

      // Not LAST_LAP and not safe: replace highest visible to avoid finishing prematurely
      const fallbackPosition = this.findHighestVisibleCard(context, false)
      return { type: "replace", position: fallbackPosition }
    }

    // More than 1 hidden card: replace a hidden card to reveal and progress
    const hiddenPositions = BotAnalytics.getHiddenCardPositions(
      context.botPlayer,
    )
    if (hiddenPositions.length > 0) {
      return { type: "replace", position: hiddenPositions[0] }
    }

    // Fallback: no hidden cards (shouldn't happen), replace highest visible
    const position = this.findHighestVisibleCard(context, false)
    return { type: "replace", position }
  }

  /**
   * Handle TURN_A_CARD turn status
   *
   * Must reveal a hidden card. Danger check already handled in handleThrowOrReplace.
   * Choose strategically to avoid breaking potential patterns.
   */
  private handleTurnCard(context: DecisionContext): BotAction {
    const position = this.chooseCardToReveal(context)
    return { type: "turn", position }
  }

  /**
   * FR1: Select same-row positions for initial reveals
   *
   * Strategy: Reveal cards in row 0 (first row) to maximize row completion
   * opportunities. If count exceeds columns, wraps to next row.
   *
   * @param context - Decision context
   * @param count - Number of cards to reveal
   * @returns Array of positions in same row(s)
   */
  private selectSameRowPositions(
    context: DecisionContext,
    count: number,
  ): Position[] {
    const positions: Position[] = []
    const { cardPerColumn, cardPerRow } = context.settings

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cardPerColumn)
      const col = i % cardPerColumn

      // Ensure we don't exceed grid boundaries
      if (row < cardPerRow && col < cardPerColumn) {
        positions.push({ row, col })
      }
    }

    return positions
  }

  /**
   * FR3: Evaluate card through priority heuristic (P1-P6)
   *
   * Priorities are checked in strict order. First match wins.
   * P1: Complete Column/Row
   * P2: Prioritize Point Reduction (End-Game)
   * P3: Progress Column/Row (Early-Game)
   * P4: Simple Point Reduction (Early-Game)
   * P5: Replace Hidden Card
   * P6: Draw from deck (no priority matched)
   *
   * @param context - Decision context
   * @param cardValue - Value of card to evaluate
   * @returns Priority action (take + position, or draw)
   */
  private evaluateDiscardPile(
    context: DecisionContext,
    cardValue: number,
  ): PriorityAction {
    // P1: Complete Column/Row
    const p1Pos = this.checkP1_CompleteColumnOrRow(cardValue, context)
    if (p1Pos) return { type: "take", position: p1Pos }

    // P2: Prioritize Point Reduction (End-Game)
    const p2Pos = this.checkP2_PrioritizePointReduction(cardValue, context)
    if (p2Pos) return { type: "take", position: p2Pos }

    // P3: Progress Column/Row (Early-Game)
    const p3Pos = this.checkP3_ProgressColumnOrRow(cardValue, context)
    if (p3Pos) return { type: "take", position: p3Pos }

    // P4: Simple Point Reduction (Early-Game)
    const p4Pos = this.checkP4_SimplePointReduction(cardValue, context)
    if (p4Pos) return { type: "take", position: p4Pos }

    // P5: Replace Hidden Card
    const p5Pos = this.checkP5_ReplaceHiddenCard(cardValue, context)
    if (p5Pos) return { type: "take", position: p5Pos }

    // P6: Draw from deck
    return { type: "draw" }
  }

  /**
   * P1: Complete Column/Row
   *
   * Takes card if it completes a column or row (2 matching visible + 1 hidden).
   * MUST NOT complete if forbidden by FR5 (negative or zero cards).
   *
   * @param cardValue - Card value to evaluate
   * @param context - Decision context
   * @returns Position to place card, or null if no completion
   */
  private checkP1_CompleteColumnOrRow(
    cardValue: number,
    context: DecisionContext,
  ): Position | null {
    // FR5: Check forbidden rules first
    if (this.isForbiddenCompletion(cardValue, context)) {
      return null
    }

    // Find 2-card patterns that would complete with this value
    const patterns = BotAnalytics.find2CardMatches(
      context.botPlayer,
      context.settings,
    )

    const completablePattern = patterns.find((p) => p.value === cardValue)
    return completablePattern ? completablePattern.hiddenPosition : null
  }

  /**
   * P2: Prioritize Point Reduction (End-Game)
   *
   * In end-game (any opponent ≤2 hidden cards), aggressively reduce points.
   * Takes cards ≤4.
   * - If bot has >1 hidden cards: Replace a hidden card (reveal to progress toward finishing)
   * - If bot has exactly 1 hidden card: Replace highest visible (avoid finishing unless safe)
   *
   * @param cardValue - Card value to evaluate
   * @param context - Decision context
   * @returns Position to place card, or null if criteria not met
   */
  private checkP2_PrioritizePointReduction(
    cardValue: number,
    context: DecisionContext,
  ): Position | null {
    // Only applies in end-game
    if (!BotAnalytics.isEndGameState(context.gameJson, context.botPlayer.id)) {
      return null
    }

    // Card must be ≤4
    if (cardValue > 4) return null

    const hiddenCount = BotAnalytics.countHiddenCards(context.botPlayer)

    // If bot has >1 hidden cards, replace a hidden card (reveal to progress toward finishing)
    if (hiddenCount > 1) {
      const hiddenPositions = BotAnalytics.getHiddenCardPositions(
        context.botPlayer,
      )
      if (hiddenPositions.length > 0) {
        // Avoid positions that would break 2-card match patterns
        for (const hiddenPos of hiddenPositions) {
          if (!this.wouldBreak2CardMatch(cardValue, hiddenPos, context)) {
            return hiddenPos
          }
        }
        // If all hidden positions would break 2-card matches, return null
        return null
      }
    }

    // If bot has exactly 1 hidden card:
    // - With forceFinish OR in LAST_LAP: replace hidden card (finishing mandatory)
    // - Without forceFinish and not LAST_LAP: replace highest visible (avoid finishing, handled by FR6)
    if (hiddenCount === 1) {
      if (
        this.forceFinish ||
        context.gameJson.roundPhase === Constants.ROUND_PHASE.LAST_LAP
      ) {
        const hiddenPositions = BotAnalytics.getHiddenCardPositions(
          context.botPlayer,
        )
        if (hiddenPositions.length === 1) {
          return hiddenPositions[0]
        }
      }
    }

    // No hidden cards (shouldn't happen), replace highest visible
    return this.findHighestVisibleCard(context, true)
  }

  /**
   * P3: Progress Column/Row (Early-Game)
   *
   * In early-game, builds toward future completions.
   * Takes card if it creates a 2-card match (1 visible + 1 hidden → 2 visible + 1 hidden).
   * Tie-breaker: Prioritizes lowest value patterns.
   * MUST NOT progress if forbidden by FR5.
   *
   * @param cardValue - Card value to evaluate
   * @param context - Decision context
   * @returns Position to place card, or null if no progress opportunity
   */
  private checkP3_ProgressColumnOrRow(
    cardValue: number,
    context: DecisionContext,
  ): Position | null {
    // FR5: Check forbidden rules
    if (this.isForbiddenCompletion(cardValue, context)) {
      return null
    }

    // Only applies in early-game
    if (
      !BotAnalytics.isEarlyGameState(context.gameJson, context.botPlayer.id)
    ) {
      return null
    }

    // Find single-card opportunities (1 visible + hidden cards)
    const columnOpps = BotAnalytics.findColumnOpportunities(
      context.botPlayer,
      context.settings,
    )
    const rowOpps = BotAnalytics.findRowOpportunities(
      context.botPlayer,
      context.settings,
    )

    // Filter for single matches that would become 2-card matches
    const singleMatches = [...columnOpps, ...rowOpps].filter(
      (opp) =>
        opp.matchCount === 1 &&
        opp.matchingValue === cardValue &&
        opp.hiddenPositions.length > 0,
    )

    if (singleMatches.length === 0) return null

    // Tie-breaker: Prioritize lowest value
    singleMatches.sort((a, b) => a.matchingValue - b.matchingValue)

    return singleMatches[0].hiddenPositions[0]
  }

  /**
   * P4: Simple Point Reduction (Early-Game)
   *
   * In early-game, takes cards ≤4 to reduce points.
   * - If bot has >1 hidden cards: Replace a hidden card (reveal and potentially reduce score)
   * - If bot has exactly 1 hidden card: Replace highest visible (avoid finishing unless safe)
   * MUST NOT place card in position that would complete forbidden pattern (FR5).
   *
   * @param cardValue - Card value to evaluate
   * @param context - Decision context
   * @returns Position to place card, or null if criteria not met
   */
  private checkP4_SimplePointReduction(
    cardValue: number,
    context: DecisionContext,
  ): Position | null {
    // Only applies in early-game
    if (
      !BotAnalytics.isEarlyGameState(context.gameJson, context.botPlayer.id)
    ) {
      return null
    }

    // Card must be ≤4
    if (cardValue > 4) return null

    const hiddenCount = BotAnalytics.countHiddenCards(context.botPlayer)

    // If bot has >1 hidden cards, replace a hidden card (reveal to progress)
    if (hiddenCount > 1) {
      const hiddenPositions = BotAnalytics.getHiddenCardPositions(
        context.botPlayer,
      )
      if (hiddenPositions.length > 0) {
        // FR5: If value is forbidden, avoid positions that would complete forbidden pattern
        const isForbiddenValue = this.isForbiddenCompletion(cardValue, context)
        if (isForbiddenValue) {
          // Find a hidden position that won't complete forbidden pattern
          for (const hiddenPos of hiddenPositions) {
            if (
              !this.wouldCompleteForbiddenPattern(cardValue, hiddenPos, context)
            ) {
              return hiddenPos
            }
          }
          // If all hidden positions would complete forbidden pattern, skip P4
          return null
        }
        // Avoid positions that would break 2-card match patterns
        // (e.g., column with 2 visible 12s + 1 hidden - don't place -2 there)
        for (const hiddenPos of hiddenPositions) {
          if (!this.wouldBreak2CardMatch(cardValue, hiddenPos, context)) {
            return hiddenPos
          }
        }
        // If all hidden positions would break 2-card matches, skip P4
        return null
      }
    }

    // If bot has exactly 1 hidden card:
    // - With forceFinish OR in LAST_LAP: replace hidden card (finishing mandatory)
    // - Without forceFinish and not LAST_LAP: replace highest visible (avoid finishing)
    if (hiddenCount === 1) {
      if (
        this.forceFinish ||
        context.gameJson.roundPhase === Constants.ROUND_PHASE.LAST_LAP
      ) {
        const hiddenPositions = BotAnalytics.getHiddenCardPositions(
          context.botPlayer,
        )
        if (hiddenPositions.length === 1) {
          // FR5: If value is forbidden, still need to check
          const isForbiddenValue = this.isForbiddenCompletion(
            cardValue,
            context,
          )
          if (
            isForbiddenValue &&
            this.wouldCompleteForbiddenPattern(
              cardValue,
              hiddenPositions[0],
              context,
            )
          ) {
            // Would complete forbidden pattern - skip P4
            return null
          }
          return hiddenPositions[0]
        }
      }
      // No forceFinish and not LAST_LAP: replace highest visible (avoid finishing)
      const candidatePosition = this.findHighestVisibleCard(context, true)

      // FR5: If value is forbidden, check if position would complete forbidden pattern
      const isForbiddenValue = this.isForbiddenCompletion(cardValue, context)
      if (
        isForbiddenValue &&
        this.wouldCompleteForbiddenPattern(
          cardValue,
          candidatePosition,
          context,
        )
      ) {
        // Try to find alternative position that won't complete forbidden pattern
        const safePosition = this.findSafePositionForForbiddenCard(
          context,
          candidatePosition,
        )
        if (safePosition) {
          return safePosition
        }
        // If no safe position found, skip P4 (don't take the card)
        return null
      }

      return candidatePosition
    }

    // No hidden cards (shouldn't happen), replace highest visible
    return this.findHighestVisibleCard(context, true)
  }

  /**
   * Check if placing a card at a position would break a 2-card match pattern
   *
   * A 2-card match pattern exists when a column/row has:
   * - 2 visible cards with the same value
   * - 1 hidden card remaining (the position we're checking)
   * - Would complete the pattern if the hidden card matches
   *
   * This method returns true ONLY if:
   * - The position is part of a 2-card match pattern (2 visible + 1 hidden)
   * - The cardValue does NOT match the pattern value (would break it)
   * - The cardValue matches the pattern value (would complete it, so return false)
   *
   * Note: P1 handles completing 2-card matches, so this protects against breaking them
   * in lower priorities (P2, P4, P5).
   *
   * @param cardValue - Value of card being placed
   * @param position - Position where card would be placed
   * @param context - Decision context
   * @returns True if placing would break a 2-card match pattern, false otherwise
   */
  private wouldBreak2CardMatch(
    cardValue: number,
    position: Position,
    context: DecisionContext,
  ): boolean {
    // Use find2CardMatches to check if this position is part of a 2-card match pattern
    const patterns = BotAnalytics.find2CardMatches(
      context.botPlayer,
      context.settings,
    )

    // Check if the position matches any pattern's hidden position
    for (const pattern of patterns) {
      if (
        pattern.hiddenPosition.col === position.col &&
        pattern.hiddenPosition.row === position.row
      ) {
        // This position is the last hidden card in a 2-card match pattern
        // Only break if the card value doesn't match (would complete if it does)
        if (pattern.value !== cardValue) {
          // Would break the pattern by placing a different value
          return true
        }
        // Would complete the pattern - don't break it (P1 should handle this, but safe check)
        return false
      }
    }

    // Position is not part of a 2-card match pattern, so it won't break anything
    return false
  }

  /**
   * Check if placing a card at a position would complete a forbidden pattern
   *
   * @param cardValue - Value of card being placed
   * @param position - Position where card would be placed
   * @param context - Decision context
   * @returns True if placing would complete a forbidden pattern
   */
  private wouldCompleteForbiddenPattern(
    cardValue: number,
    position: Position,
    context: DecisionContext,
  ): boolean {
    // Check column
    if (context.settings.removeIdenticalColumn) {
      const column = context.botPlayer.cards[position.col]
      const visible = column.filter((c) => c.isVisible && c.value !== undefined)
      const hidden = column.filter((c) => !c.isVisible)

      // If 2 visible cards match cardValue and exactly 1 hidden (the position we're placing at)
      if (visible.length === 2 && hidden.length === 1) {
        const firstValue = visible[0].value
        if (
          firstValue !== undefined &&
          visible[1].value === firstValue &&
          firstValue === cardValue
        ) {
          // Would complete column - check if forbidden
          if (this.isForbiddenCompletion(cardValue, context)) {
            return true
          }
        }
      }
    }

    // Check row
    if (context.settings.removeIdenticalRow) {
      const row = context.botPlayer.cards.map((col) => col[position.row])
      const visible = row.filter((c) => c.isVisible && c.value !== undefined)
      const hidden = row.filter((c) => !c.isVisible)

      // If 2 visible cards match cardValue and exactly 1 hidden (the position we're placing at)
      if (visible.length === 2 && hidden.length === 1) {
        const firstValue = visible[0].value
        if (
          firstValue !== undefined &&
          visible[1].value === firstValue &&
          firstValue === cardValue
        ) {
          // Would complete row - check if forbidden
          if (this.isForbiddenCompletion(cardValue, context)) {
            return true
          }
        }
      }
    }

    return false
  }

  /**
   * Find a safe position for a forbidden card that won't complete a forbidden pattern
   *
   * @param context - Decision context
   * @param excludePosition - Position to exclude (the one that would complete forbidden)
   * @returns Safe position, or null if none found
   */
  private findSafePositionForForbiddenCard(
    context: DecisionContext,
    excludePosition: Position,
  ): Position | null {
    // Find all visible card positions, excluding the one that would complete forbidden pattern
    let bestPosition: Position | null = null
    let bestValue = -Infinity

    context.botPlayer.cards.forEach((column, col) => {
      column.forEach((card, row) => {
        if (!card.isVisible) return
        if (card.value === undefined) return
        // Skip the excluded position
        if (col === excludePosition.col && row === excludePosition.row) return

        // Exclude positions in 2-card matches (same logic as findHighestVisibleCard)
        const patterns = BotAnalytics.find2CardMatches(
          context.botPlayer,
          context.settings,
        )
        const isInMatch = patterns.some((pattern) => {
          if (pattern.type === "column" && pattern.index === col) {
            const colCards = context.botPlayer.cards[col]
            return (
              colCards[row].isVisible && colCards[row].value === pattern.value
            )
          }
          if (pattern.type === "row" && pattern.index === row) {
            return (
              context.botPlayer.cards[col][row].isVisible &&
              context.botPlayer.cards[col][row].value === pattern.value
            )
          }
          return false
        })
        if (isInMatch) return

        if (card.value > bestValue) {
          bestValue = card.value
          bestPosition = { row, col }
        }
      })
    })

    return bestPosition
  }

  /**
   * P5: Replace Hidden Card
   *
   * Takes cards ≤4 if all visible cards are already ≤4 or part of 2-card matches.
   * Replaces a hidden card to improve overall position.
   *
   * @param cardValue - Card value to evaluate
   * @param context - Decision context
   * @returns Position to place card, or null if criteria not met
   */
  private checkP5_ReplaceHiddenCard(
    cardValue: number,
    context: DecisionContext,
  ): Position | null {
    // Card must be ≤4
    if (cardValue > 4) return null

    // Don't apply P5 if player has too many hidden cards
    // Need to reveal more cards first before optimizing hidden ones
    // This prevents deadlock where bot keeps picking from discard forever
    // CRITICAL: Player must reveal ALL cards (0 hidden) to end round, so be very restrictive
    const hiddenCount = BotAnalytics.countHiddenCards(context.botPlayer)
    if (hiddenCount > 1) return null // Only apply on last 1-2 cards

    // Get 2-card match positions
    const patterns = BotAnalytics.find2CardMatches(
      context.botPlayer,
      context.settings,
    )

    // Build set of positions in 2-card matches (visible cards only)
    const matchPositions = new Set<string>()
    for (const pattern of patterns) {
      // Find visible cards in this pattern
      if (pattern.type === "column") {
        const column = context.botPlayer.cards[pattern.index]
        column.forEach((card, row) => {
          if (card.isVisible && card.value === pattern.value) {
            matchPositions.add(`${pattern.index},${row}`)
          }
        })
      } else {
        // row pattern
        context.botPlayer.cards.forEach((column, col) => {
          const card = column[pattern.index]
          if (card.isVisible && card.value === pattern.value) {
            matchPositions.add(`${col},${pattern.index}`)
          }
        })
      }
    }

    // Check if all visible cards are ≤4 OR part of 2-card match
    const allVisibleGoodOrMatched = context.botPlayer.cards.every(
      (column, col) =>
        column.every((card, row) => {
          if (!card.isVisible) return true // Skip hidden cards
          const isMatched = matchPositions.has(`${col},${row}`)
          const isGood = card.value !== undefined && card.value <= 4
          return isGood || isMatched
        }),
    )

    if (!allVisibleGoodOrMatched) return null

    // Replace a hidden card (avoid breaking 2-card matches)
    const hiddenPositions = BotAnalytics.getHiddenCardPositions(
      context.botPlayer,
    )
    if (hiddenPositions.length > 0) {
      // Avoid positions that would break 2-card match patterns
      for (const hiddenPos of hiddenPositions) {
        if (!this.wouldBreak2CardMatch(cardValue, hiddenPos, context)) {
          return hiddenPos
        }
      }
      // If all hidden positions would break 2-card matches, return null
      return null
    }
    return null
  }

  /**
   * FR5: Check if completing a pattern is forbidden
   *
   * Rule 5.1: CANNOT complete negative columns/rows
   * Rule 5.2: CANNOT complete zero columns/rows UNLESS both
   *           removeIdenticalColumn AND removeIdenticalRow are enabled
   *
   * @param value - Card value
   * @param context - Decision context
   * @returns True if completion is forbidden
   */
  private isForbiddenCompletion(
    value: number,
    context: DecisionContext,
  ): boolean {
    // Rule 5.1: Negative cards CANNOT complete
    if (value < 0) return true

    // Rule 5.2: Zero cards CANNOT complete unless BOTH settings enabled
    if (value === 0) {
      const { removeIdenticalColumn, removeIdenticalRow } = context.settings
      return !(removeIdenticalColumn && removeIdenticalRow)
    }

    return false
  }

  /**
   * FR6: Check if bot can safely finish the round
   *
   * When bot has 1 hidden card and a selected card, determines if it's safe to
   * finish by replacing the hidden card with the selected card.
   *
   * Estimates bot's final score:
   * - Current visible score (known)
   * - Selected card value (will replace hidden card - known)
   * - Assumed hidden card value is replaced, so doesn't count
   *
   * Safe if: botVisibleScore + selectedCardValue + margin <= lowestOppVisibleScore
   * This ensures bot will have strictly lower score with safety margin.
   *
   * @param context - Decision context
   * @param selectedCardValue - The card that would replace the hidden card
   * @returns True if it's safe to finish (replace hidden card with selected card)
   */
  private canSafelyFinish(
    context: DecisionContext,
    selectedCardValue: number,
  ): boolean {
    // Force finish mode: always finish when enabled (for testing/deadlock prevention)
    if (this.forceFinish) {
      return true
    }

    // In LAST_LAP, finishing is mandatory - always safe
    if (context.gameJson.roundPhase === Constants.ROUND_PHASE.LAST_LAP) {
      return true
    }

    const botVisibleScore = BotAnalytics.calculateVisibleScore(
      context.botPlayer,
    )
    const lowestOppVisibleScore = BotAnalytics.getOpponentsLowestVisibleScore(
      context.gameJson,
      context.botPlayer.id,
    )

    // If no opponents (shouldn't happen), safe to finish
    if (lowestOppVisibleScore === Number.MAX_SAFE_INTEGER) return true

    // Adjust safety margin based on opponent state:
    // - If no opponents have 1 hidden: margin = 0 (more aggressive, finish if we're equal/better)
    // - If any opponent has 1 hidden: margin = 5 (conservative, ensure we have advantage)
    const opponents = context.gameJson.players.filter(
      (p) => p.id !== context.botPlayer.id,
    )
    const opponentsWithOneHidden = opponents.filter(
      (opp) => BotAnalytics.countHiddenCards(opp) === 1,
    ).length

    // Safety formula: botEstimatedFinalScore + margin < lowestOpp
    // - selectedCardValue: Card replacing hidden card (known final value)
    // - safetyMargin: Adjusted based on opponent finishing state
    const botEstimatedFinalScore = botVisibleScore + selectedCardValue
    const safetyMargin = opponentsWithOneHidden > 0 ? 3 : 0
    return botEstimatedFinalScore + safetyMargin < lowestOppVisibleScore
  }

  /**
   * Find highest visible card position
   *
   * Used by P2 and P4 to identify worst card to replace.
   *
   * @param context - Decision context
   * @param exclude2CardMatches - If true, excludes positions in 2-card matches
   * @returns Position of highest visible card
   */
  private findHighestVisibleCard(
    context: DecisionContext,
    exclude2CardMatches: boolean,
  ): Position {
    let highestValue = -Infinity
    let highestPosition: Position | null = null

    // Build exclusion set if needed
    const excludePositions = new Set<string>()
    if (exclude2CardMatches) {
      const patterns = BotAnalytics.find2CardMatches(
        context.botPlayer,
        context.settings,
      )
      for (const pattern of patterns) {
        if (pattern.type === "column") {
          const column = context.botPlayer.cards[pattern.index]
          column.forEach((card, row) => {
            if (card.isVisible && card.value === pattern.value) {
              excludePositions.add(`${pattern.index},${row}`)
            }
          })
        } else {
          context.botPlayer.cards.forEach((column, col) => {
            const card = column[pattern.index]
            if (card.isVisible && card.value === pattern.value) {
              excludePositions.add(`${col},${pattern.index}`)
            }
          })
        }
      }
    }

    // Find highest visible card
    context.botPlayer.cards.forEach((column, col) => {
      column.forEach((card, row) => {
        if (!card.isVisible) return
        if (card.value === undefined) return
        if (exclude2CardMatches && excludePositions.has(`${col},${row}`)) return

        if (card.value > highestValue) {
          highestValue = card.value
          highestPosition = { row, col }
        }
      })
    })

    // Fallback: if no visible cards (or all excluded), return first position
    if (highestPosition === null) {
      return { row: 0, col: 0 }
    }

    return highestPosition
  }

  /**
   * Choose a card to reveal strategically
   *
   * Strategy: Avoid revealing cards in columns/rows with potential patterns.
   * If all positions are in patterns, choose randomly.
   *
   * @param context - Decision context
   * @returns Position to reveal
   */
  private chooseCardToReveal(context: DecisionContext): Position {
    const hiddenPositions = BotAnalytics.getHiddenCardPositions(
      context.botPlayer,
    )

    if (hiddenPositions.length === 0) {
      throw new Error(
        `Bot player ${context.botPlayer.id} has no hidden cards to reveal`,
      )
    }

    // Find positions NOT in column or row opportunities
    const columnOpps = BotAnalytics.findColumnOpportunities(
      context.botPlayer,
      context.settings,
    )
    const rowOpps = BotAnalytics.findRowOpportunities(
      context.botPlayer,
      context.settings,
    )

    const opportunityPositions = new Set<string>()
    for (const opp of columnOpps) {
      for (const pos of opp.hiddenPositions) {
        opportunityPositions.add(`${pos.col},${pos.row}`)
      }
    }
    for (const opp of rowOpps) {
      for (const pos of opp.hiddenPositions) {
        opportunityPositions.add(`${pos.col},${pos.row}`)
      }
    }

    const nonOpportunityPositions = hiddenPositions.filter(
      (pos) => !opportunityPositions.has(`${pos.col},${pos.row}`),
    )

    if (nonOpportunityPositions.length > 0) {
      // Reveal from non-opportunity positions
      return nonOpportunityPositions[
        Math.floor(Math.random() * nonOpportunityPositions.length)
      ]
    }

    // All positions are in opportunities, reveal randomly
    return hiddenPositions[Math.floor(Math.random() * hiddenPositions.length)]
  }
}
