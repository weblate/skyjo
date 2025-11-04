import { Constants } from "../../constants.js"
import { getPlayerRanks } from "../../utils/winner.js"
import { Game } from "../Game.js"
import { type GameOperationManagerInterface } from "../GameOperationManager.js"
import { Player } from "../Player.js"
import { Settings } from "../Settings.js"
import { Bot } from "./Bot.js"

/**
 * Simulation-specific operation manager
 * Executes callbacks immediately without delays for fast simulation
 */
class SimulationGameOperationManager implements GameOperationManagerInterface {
  async delayNewRound(
    _game: Game,
    callback: () => Promise<void>,
    _ms: number,
  ): Promise<void> {
    // Execute immediately without delay for simulation speed
    await callback()
  }

  async updateGame(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async removeGame(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async startRevealCardsAfkTimer(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async cancelRevealCardsAfkTimer(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async startPlayerAfkTimer(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async cancelPlayerAfkTimer(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async getSocket(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async kickSocket(): Promise<void> {
    /* Placeholder that should not be called */
  }
  async storeGameIfNeeded(): Promise<void> {
    /* Placeholder that should not be called */
  }
}

/**
 * Configuration for a single simulation
 */
export interface SimulationConfig {
  playerCount: number
  settings?: Partial<{
    removeIdenticalColumn: boolean
    removeIdenticalRow: boolean
    initialTurnedCount: number
    cardPerRow: number
    cardPerColumn: number
  }>
}

/**
 * Result of a single game simulation
 */
export interface SimulationResult {
  winner: string
  botPlayerId: string
  botWon: boolean
  botFinalScore: number
  botRoundScores: number[]
  totalRounds: number
  gameCode: string
}

/**
 * Aggregated results from bulk simulations
 */
export interface BulkResults {
  totalGames: number
  botWins: number
  winRate: number
  averageScore: number
  averageRoundScore: number
  medianScore: number
  scoreDistribution: { score: number; count: number }[]
  minScore: number
  maxScore: number
}

/**
 * SimulationRunner
 *
 * Runs automated game simulations with bot players to test bot performance.
 * Used for validating AC1 (win rate) and AC2 (average score) requirements.
 */
export class SimulationRunner {
  /**
   * Run a single full game simulation
   *
   * Creates a game with N bot players and plays until completion (≥100 points).
   * Tracks the first bot's performance as the "target bot" for statistics.
   *
   * @param config - Simulation configuration
   * @returns Game result with target bot's performance
   */
  static async runFullGame(
    config: SimulationConfig,
  ): Promise<SimulationResult> {
    // Create game settings
    const settings = new Settings(false, config.playerCount)
    if (config.settings) {
      settings.updateSettings(config.settings)
    }

    const game = new Game({
      hostId: "sim-host",
      settings,
    })
    game.setOperationManager(new SimulationGameOperationManager())

    // Add bot players
    const players: Player[] = []
    for (let i = 0; i < config.playerCount; i++) {
      const player = new Player({
        name: `Bot ${i}`,
        avatar: Constants.AVATARS.BEE,
      })
      game.addPlayer(player)
      players.push(player)
    }

    const targetBot = players[0]
    const targetBotId = targetBot.id

    // Create bots: all bots use strategic logic except the last one which uses forceFinish
    // to prevent deadlocks. This ensures fair competition while guaranteeing game completion.
    const botMap = new Map<string, Bot>()
    for (const [index, player] of players.entries()) {
      // Last bot (highest index) uses forceFinish to break deadlocks
      // All other bots use strategic logic for fair competition
      const isLastBot = index === players.length - 1
      botMap.set(player.id, new Bot({ forceFinish: isLastBot }))
    }

    // Start game
    game.start()

    // Play until game finishes (someone reaches 100 points)
    let roundCount = 0
    const maxRounds = 500 // Safety limit

    while (
      game.status !== Constants.GAME_STATUS.FINISHED &&
      roundCount < maxRounds
    ) {
      await this.playRound(game, botMap)
      roundCount++
      // Note: Game automatically starts new round via operation manager
    }

    if (game.status !== Constants.GAME_STATUS.FINISHED) {
      throw new Error(
        `Game did not finish after ${maxRounds} rounds. ` +
          `Game code: ${game.code}, ` +
          `Status: ${game.status}, ` +
          `Round phase: ${game.roundPhase}, ` +
          `Players scores: ${game.players.map((p) => p.score).join(", ")}`,
      )
    }

    // Get results
    const gameJson = game.toJson()
    const ranks = getPlayerRanks(gameJson.players)

    // Find winner(s) - players with rank 1
    const winnerId = Object.entries(ranks).find(([_, rank]) => rank === 1)?.[0]

    if (!winnerId) {
      const playerNamesAndScores = gameJson.players.map(
        (p) => `${p.name} (${p.score})`,
      )
      throw new Error(
        `No winner found. Game code: ${game.code}, Players: ${playerNamesAndScores.join(", ")}`,
      )
    }

    return {
      winner: winnerId,
      botPlayerId: targetBotId,
      botWon: winnerId === targetBotId,
      botFinalScore: targetBot.score,
      botRoundScores: targetBot.scores.map((s) => {
        if (s === "-") return 0
        if (typeof s === "object") return s.score
        return s
      }),
      totalRounds: targetBot.scores.length,
      gameCode: game.code,
    }
  }

  /**
   * Play a complete round
   *
   * Handles initial reveals and all player turns until round ends.
   * The game automatically transitions through phases and handles scoring.
   *
   * @param game - Game instance
   * @param botMap - Map of player IDs to Bot instances
   */
  private static async playRound(
    game: Game,
    botMap: Map<string, Bot>,
  ): Promise<void> {
    // Handle initial reveals if needed
    if (game.roundPhase === Constants.ROUND_PHASE.REVEAL_CARDS) {
      await this.handleInitialReveals(game, botMap)
    }

    // Play main phase (and LAST_LAP) until round ends
    // The game will automatically transition to OVER phase and handle scoring
    if (
      game.roundPhase === Constants.ROUND_PHASE.MAIN ||
      game.roundPhase === Constants.ROUND_PHASE.LAST_LAP
    ) {
      await this.playMainPhase(game, botMap)
    }
  }

  /**
   * Handle initial card reveals for all players
   */
  private static async handleInitialReveals(
    game: Game,
    botMap: Map<string, Bot>,
  ): Promise<void> {
    for (const player of game.players) {
      const bot = botMap.get(player.id)
      if (!bot) {
        throw new Error(`No bot found for player ${player.id}`)
      }
      const actions = bot.playInitialReveal(game.toJson(), player.id)

      for (const action of actions) {
        if (action.type === "reveal") {
          await game.revealCard({
            player,
            column: action.position.col,
            row: action.position.row,
            wasAfk: false,
          })
        }
      }
    }
  }

  /**
   * Play the main phase until round ends
   *
   * Continues playing turns until round phase changes (indicating round end).
   * Handles both MAIN and LAST_LAP phases - players continue taking turns
   * during LAST_LAP until all have played their last turn.
   * The game will automatically set hasPlayedLastTurn for players and
   * transition to OVER phase when appropriate.
   */
  private static async playMainPhase(
    game: Game,
    botMap: Map<string, Bot>,
  ): Promise<void> {
    const maxTurns = 500 // Safety limit per round
    let turnCount = 0

    while (
      (game.roundPhase === Constants.ROUND_PHASE.MAIN ||
        game.roundPhase === Constants.ROUND_PHASE.LAST_LAP) &&
      turnCount < maxTurns
    ) {
      const currentPlayer = game.getCurrentPlayer()
      if (!currentPlayer) {
        throw new Error(
          `No current player found during active phase. ` +
            `Turn: ${game.turn}, Players: ${game.players.length}, ` +
            `Round phase: ${game.roundPhase}, ` +
            `Game code: ${game.code}`,
        )
      }

      await this.playTurn(game, botMap, currentPlayer.id)
      turnCount++
    }

    if (turnCount >= maxTurns) {
      throw new Error(
        `Round did not end after ${maxTurns} turns. ` +
          `Game code: ${game.code}, ` +
          `Round phase: ${game.roundPhase}, ` +
          `Players last turn status: ${game.players.map((p) => p.hasPlayedLastTurn).join(", ")}`,
      )
    }
  }

  /**
   * Play a single player's turn
   *
   * Repeatedly calls bot.playMove() and executes actions until turn is complete.
   * A turn may require multiple actions (e.g., pick-draw → evaluate → discard → turn).
   *
   * Turn ends when either:
   * 1. Current player changes (turn advanced to next player)
   * 2. Round phase changes (round ended)
   *
   * @param game - Game instance
   * @param botMap - Map of player IDs to Bot instances
   * @param playerId - Current player ID
   */
  private static async playTurn(
    game: Game,
    botMap: Map<string, Bot>,
    playerId: string,
  ): Promise<void> {
    const maxActionsPerTurn = 10 // Safety limit
    let actionCount = 0

    const initialTurnStatus = game.turnStatus
    const initialRoundPhase = game.roundPhase

    while (actionCount < maxActionsPerTurn) {
      // Check if turn/round ended
      const currentPlayer = game.getCurrentPlayer()
      if (currentPlayer?.id !== playerId) {
        // Turn advanced to next player
        break
      }

      if (
        game.roundPhase !== Constants.ROUND_PHASE.MAIN &&
        game.roundPhase !== Constants.ROUND_PHASE.LAST_LAP
      ) {
        break
      }

      try {
        const bot = botMap.get(playerId)
        if (!bot) {
          throw new Error(`No bot found for player ${playerId}`)
        }
        const action = bot.playMove(game.toJson(), playerId)

        // Execute action (matching PlayerAfkQueueService logic)
        switch (action.type) {
          case "pick-discard":
            // COMPOUND ACTION: pick from discard AND immediately replace
            game.pickFromDiscard()
            await game.replaceCard({
              column: action.replaceAt.col,
              row: action.replaceAt.row,
              wasAfk: false,
            })
            // replaceCard() calls finishTurn() internally, turn will advance
            break

          case "pick-draw":
            game.drawCard()
            // After drawing, bot needs to decide keep/discard (next iteration)
            break

          case "replace":
            await game.replaceCard({
              column: action.position.col,
              row: action.position.row,
              wasAfk: false,
            })
            // replaceCard() calls finishTurn() internally, turn will advance
            break

          case "discard":
            if (game.selectedCardValue !== null) {
              game.discardCard(game.selectedCardValue)
              // After discard, need to reveal a card (next iteration)
            } else {
              throw new Error("Cannot discard: selectedCardValue is null")
            }
            break

          case "turn":
            await game.turnCard({
              player: game.getCurrentPlayer(),
              column: action.position.col,
              row: action.position.row,
              wasAfk: false,
            })
            // turnCard() calls finishTurn() internally, turn will advance
            break

          case "reveal":
            throw new Error(
              "Reveal action should only occur during initial phase",
            )

          default:
            throw new Error(`Unknown action type: ${action}`)
        }

        actionCount++
      } catch (error) {
        throw new Error(
          `Error executing bot action: ${error}. ` +
            `Player: ${playerId}, ` +
            `Turn status: ${game.turnStatus}, ` +
            `Action count: ${actionCount}, ` +
            `Game code: ${game.code}`,
        )
      }
    }

    if (actionCount >= maxActionsPerTurn) {
      throw new Error(
        `Turn did not complete after ${maxActionsPerTurn} actions. ` +
          `Player: ${playerId}, ` +
          `Initial status: ${initialTurnStatus}, ` +
          `Current status: ${game.turnStatus}, ` +
          `Initial phase: ${initialRoundPhase}, ` +
          `Current phase: ${game.roundPhase}, ` +
          `Current player: ${game.getCurrentPlayer()?.id}, ` +
          `Game code: ${game.code}`,
      )
    }
  }

  /**
   * Run multiple simulations and aggregate results
   *
   * @param count - Number of games to simulate
   * @param config - Configuration for each game
   * @returns Aggregated statistics
   */
  static async runBulkSimulations(
    count: number,
    config: SimulationConfig,
  ): Promise<BulkResults> {
    const results: SimulationResult[] = []

    for (let i = 0; i < count; i++) {
      const result = await this.runFullGame(config)
      results.push(result)
    }

    return this.aggregateResults(results)
  }

  /**
   * Aggregate simulation results into statistics
   */
  private static aggregateResults(results: SimulationResult[]): BulkResults {
    const botWins = results.filter((r) => r.botWon).length
    const totalGames = results.length

    // Calculate average final score
    const avgFinalScore =
      results.reduce((sum, r) => sum + r.botFinalScore, 0) / totalGames

    // Calculate average round score (all rounds across all games)
    const allRoundScores = results.flatMap((r) => r.botRoundScores)
    const avgRoundScore =
      allRoundScores.reduce((sum, s) => sum + s, 0) / allRoundScores.length

    // Calculate median score
    const sortedScores = results
      .map((r) => r.botFinalScore)
      .sort((a, b) => a - b)
    const medianScore =
      sortedScores.length % 2 === 0
        ? (sortedScores[sortedScores.length / 2 - 1] +
            sortedScores[sortedScores.length / 2]) /
          2
        : sortedScores[Math.floor(sortedScores.length / 2)]

    // Score distribution (group by 10s)
    const distribution = new Map<number, number>()
    for (const result of results) {
      const bucket = Math.floor(result.botFinalScore / 10) * 10
      distribution.set(bucket, (distribution.get(bucket) || 0) + 1)
    }

    const scoreDistribution = Array.from(distribution.entries())
      .map(([score, count]) => ({ score, count }))
      .sort((a, b) => a.score - b.score)

    return {
      totalGames,
      botWins,
      winRate: botWins / totalGames,
      averageScore: avgFinalScore,
      averageRoundScore: avgRoundScore,
      medianScore,
      scoreDistribution,
      minScore: Math.min(...results.map((r) => r.botFinalScore)),
      maxScore: Math.max(...results.map((r) => r.botFinalScore)),
    }
  }
}
