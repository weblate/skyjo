import type { Game, Player } from "@skymo/core"
import { Bot, type BotAction } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import type { Job } from "bullmq"
import { GameOperationManager } from "@/realtime/utils/GameOperationManager.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { BaseAfkQueueService } from "./BaseAfkQueueService.js"

export interface PlayerAfkJobData {
  gameCode: string
  playerId: string
}

export class PlayerAfkQueueService extends BaseAfkQueueService<PlayerAfkJobData> {
  private static instance: PlayerAfkQueueService
  private readonly bot: Bot

  private readonly timeoutBetweenActions = 800

  private constructor() {
    super("player-afk-timer")
    this.bot = new Bot("medium")
  }

  public static getInstance(): PlayerAfkQueueService {
    PlayerAfkQueueService.instance ??= new PlayerAfkQueueService()

    return PlayerAfkQueueService.instance
  }

  public static exists(): boolean {
    return PlayerAfkQueueService.instance !== null
  }

  public async startTimer(game: Game, playerId: string): Promise<void> {
    // Don't start timer if game is already processing AFK
    if (game.processingAfk) {
      Logger.debug(
        `Game ${game.code} is processing AFK, skipping timer start for player ${playerId}`,
        {
          gameCode: game.code,
          playerId,
        },
      )
      return
    }

    const player = game.getPlayerById(playerId)
    if (!player) {
      Logger.warn(
        `Player ${playerId} not found in game ${game.code}, skipping timer start`,
        {
          gameCode: game.code,
          playerId,
        },
      )
      return
    }

    const timeoutDuration = this.getAfkTimeout(game, player)
    const jobId = this.getJobId(game.code, playerId)

    Logger.info(
      `Starting AFK timer for player ${playerId} in game ${game.code}`,
      {
        gameCode: game.code,
        playerId,
        timeoutDuration,
        jobId,
      },
    )

    try {
      const job = await this.queue.add(
        jobId,
        {
          gameCode: game.code,
          playerId: playerId,
        },
        {
          delay: timeoutDuration,
          jobId,
          removeOnComplete: true,
          removeOnFail: 50,
        },
      )

      if (!job) {
        throw new Error("Failed to create AFK timer job")
      }

      Logger.info(
        `AFK timer started for player ${playerId} in game ${game.code}`,
        {
          gameCode: game.code,
          playerId,
          jobId: job.id,
          scheduledFor: job.timestamp + timeoutDuration,
        },
      )
    } catch (error) {
      Logger.error(
        `Failed to start AFK timer for player ${playerId} in game ${game.code}`,
        {
          gameCode: game.code,
          playerId,
          error,
        },
      )
      throw error
    }
  }

  public async cancelTimer(gameCode: string, playerId: string): Promise<void> {
    const jobId = this.getJobId(gameCode, playerId)

    Logger.info(
      `Cancelling AFK timer for player ${playerId} in game ${gameCode}`,
      {
        gameCode,
        playerId,
        jobId,
      },
    )

    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        const job = await this.queue.getJob(jobId)
        if (job) {
          await job.remove()
          Logger.debug(
            `Successfully cancelled AFK timer for player ${playerId} in game ${gameCode}`,
            {
              gameCode,
              playerId,
              jobId,
              attempt: retryCount + 1,
            },
          )
          return
        } else {
          Logger.debug(
            `No AFK timer found for player ${playerId} in game ${gameCode}`,
            {
              gameCode,
              playerId,
              jobId,
            },
          )
          return
        }
      } catch (error) {
        retryCount++
        if (retryCount >= maxRetries) {
          Logger.error(
            `Failed to cancel AFK timer for player ${playerId} in game ${gameCode} after ${maxRetries} attempts`,
            {
              error,
              gameCode,
              playerId,
              jobId,
              attempts: retryCount,
            },
          )
        } else {
          Logger.warn(
            `Failed to cancel AFK timer, retrying... (${retryCount}/${maxRetries})`,
            {
              error,
              gameCode,
              playerId,
              jobId,
            },
          )
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 200))
        }
      }
    }
  }

  async processJob(job: Job<PlayerAfkJobData>) {
    const { gameCode, playerId } = job.data

    Logger.info(
      `Processing AFK job for player ${playerId} in game ${gameCode}`,
      {
        gameCode,
        playerId,
        jobId: job.id,
      },
    )

    const game = await this.redis.getGameSafe(gameCode)
    if (!game) {
      Logger.warn(
        `Game ${gameCode} not found in Redis, skipping AFK job for player ${playerId}`,
        {
          gameCode,
          playerId,
          jobId: job.id,
        },
      )
      return
    }

    let lockAcquired = false

    try {
      game.setOperationManager(GameOperationManager.getInstance())
      if (
        !game.isPlaying() ||
        (!game.isRoundMain() && !game.isRoundRevealCards())
      ) {
        Logger.debug(
          `Game ${gameCode} is not in playing state or not in valid round, skipping AFK job`,
          {
            gameCode,
            playerId,
            jobId: job.id,
            isPlaying: game.isPlaying(),
            isRoundMain: game.isRoundMain(),
            isRoundRevealCards: game.isRoundRevealCards(),
          },
        )
        return
      }

      await this.lockGame(game)
      lockAcquired = true

      const player = game.getPlayerById(playerId)
      if (!player) {
        Logger.warn(`Player ${playerId} not found in game ${gameCode}`, {
          gameCode,
          playerId,
          jobId: job.id,
        })
        return
      }

      if (game.isRoundRevealCards()) {
        if (player.hasRevealedCardCount) {
          Logger.debug(
            `Player ${playerId} already revealed required cards in game ${gameCode}`,
            {
              gameCode,
              playerId,
              playerName: player.name,
              revealedCount: player.hasRevealedCardCount,
              requiredCount: game.settings.initialTurnedCount,
            },
          )
          return
        }

        Logger.info(
          `Player ${playerId} has not completed reveals, performing AFK reveal action`,
          {
            gameCode,
            playerId,
            jobId: job.id,
          },
        )

        const disconnect = await this.increaseAfkCount(game, player)
        if (!disconnect) {
          await this.performAfkReveal(game, player)
        }
        return
      }

      const currentPlayer = game.getCurrentPlayer()
      if (currentPlayer?.id === playerId) {
        Logger.info(
          `Player ${playerId} is current player, performing AFK action`,
          {
            gameCode,
            playerId,
            jobId: job.id,
          },
        )

        const disconnect = await this.increaseAfkCount(game, player)

        if (!disconnect) {
          await this.performAfkMove(game)
        }
      } else {
        Logger.debug(
          `Player ${playerId} is not current player, skipping AFK action`,
          {
            gameCode,
            playerId,
            currentPlayerId: currentPlayer?.id,
            jobId: job.id,
          },
        )
      }
    } catch (error) {
      Logger.error(
        `Error processing AFK job for player ${playerId} in game ${gameCode}`,
        {
          gameCode,
          playerId,
          jobId: job.id,
          error: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
        },
      )

      if (
        error instanceof CError &&
        error.code === ErrorConstants.ERROR.PLAYER_NOT_FOUND
      ) {
        return
      }

      if (
        error instanceof CError &&
        error.code === ErrorConstants.ERROR.GAME_ALREADY_PROCESSING_AFK
      ) {
        Logger.warn(
          `Game ${gameCode} is already processing AFK, skipping duplicate job`,
          {
            gameCode,
            playerId,
            jobId: job.id,
          },
        )
        return
      }

      await job.moveToFailed(
        error instanceof Error ? error : new Error(String(error)),
        job?.token ?? "failed",
      )
      throw error
    } finally {
      if (lockAcquired) {
        await this.unlockGame(game)
      }
    }
  }

  //#region private methods

  private getJobId(gameCode: string, playerId: string): string {
    return `game:${gameCode}:player:${playerId}`
  }

  private async performAfkMove(game: Game) {
    const stateManager = new GameStateTracker(game)

    const initialPlayer = game.getCurrentPlayer()
    const initialPlayerId = initialPlayer.id
    Logger.info(
      `Performing AFK move for player ${initialPlayer.id} (${initialPlayer.name}) in game ${game.code}`,
      {
        gameCode: game.code,
        playerId: initialPlayer.id,
        playerName: initialPlayer.name,
        turnStatus: game.turnStatus,
      },
    )

    try {
      let moveCount = 0
      const maxMoves = 10 // Safety limit to prevent infinite loops

      while (moveCount < maxMoves) {
        const currentPlayer = game.getCurrentPlayer()

        if (currentPlayer.id !== initialPlayerId) {
          Logger.debug(
            `Turn completed - player ${initialPlayerId} is no longer current player`,
            {
              gameCode: game.code,
              playerId: initialPlayerId,
              currentPlayerId: currentPlayer.id,
              movesExecuted: moveCount,
            },
          )
          break
        }

        if (!game.isPlaying() || !game.isRoundMain()) {
          Logger.debug(`Game state changed, stopping AFK moves`, {
            gameCode: game.code,
            playerId: initialPlayerId,
            isPlaying: game.isPlaying(),
            isRoundMain: game.isRoundMain(),
          })
          break
        }

        const botActions = this.bot.playMove(game.toJson(), initialPlayerId)
        if (botActions.length === 0) {
          Logger.warn(`Bot returned no actions, turn may be complete`, {
            gameCode: game.code,
            playerId: initialPlayerId,
            turnStatus: game.turnStatus,
          })
          break
        }

        await this.executeBotActions(
          game,
          currentPlayer,
          botActions,
          stateManager,
        )

        moveCount++
      }

      if (moveCount >= maxMoves) {
        Logger.warn(
          `Reached max moves limit (${maxMoves}) for player ${initialPlayerId}`,
          {
            gameCode: game.code,
            playerId: initialPlayerId,
          },
        )
      }

      Logger.info(
        `AFK bot turn completed for player ${initialPlayer.id} (${initialPlayer.name}) in game ${game.code}`,
        {
          gameCode: game.code,
          playerId: initialPlayer.id,
          playerName: initialPlayer.name,
          movesExecuted: moveCount,
        },
      )
    } catch (error) {
      Logger.error(`Bot action failed for player ${initialPlayer.id}`, {
        gameCode: game.code,
        playerId: initialPlayer.id,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }

    this.warnPlayer(initialPlayer)
    await this.updateAndSendGame(game, stateManager)
  }

  /**
   * Perform AFK reveal for a player during the reveal cards phase
   * Uses Bot to strategically select which cards to reveal
   */
  private async performAfkReveal(game: Game, player: Player): Promise<void> {
    const stateManager = new GameStateTracker(game)

    Logger.info(
      `Performing AFK reveal for player ${player.id} (${player.name}) in game ${game.code}`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
      },
    )

    try {
      let revealCount = 0
      const maxAttempts = game.settings.initialTurnedCount * 2

      while (!player.hasRevealedCardCount && revealCount < maxAttempts) {
        const botActions = this.bot.playInitialReveal(game.toJson(), player.id)

        if (botActions.length === 0) {
          Logger.warn(
            `Bot returned no reveal actions for player ${player.id}`,
            {
              gameCode: game.code,
              playerId: player.id,
              turnStatus: game.turnStatus,
              revealedSoFar: revealCount,
            },
          )
          break
        }

        for (const action of botActions) {
          if (action.type === "reveal") {
            Logger.info(
              `Revealing card at ${action.position.col},${action.position.row} for AFK player ${player.id}`,
              {
                gameCode: game.code,
                playerId: player.id,
                cardColumn: action.position.col,
                cardRow: action.position.row,
                attemptNumber: revealCount + 1,
              },
            )

            await game.revealCard({
              player,
              column: action.position.col,
              row: action.position.row,
              wasAfk: true,
            })

            await this.updateAndSendGame(game, stateManager)
            revealCount++

            if (player.hasRevealedCardCount) {
              break
            }
          }
        }
      }

      if (revealCount >= maxAttempts && !player.hasRevealedCardCount) {
        Logger.warn(
          `Reached max reveal attempts for player ${player.id} but reveals not complete`,
          {
            gameCode: game.code,
            playerId: player.id,
            revealCount,
            required: game.settings.initialTurnedCount,
          },
        )
      }

      Logger.info(
        `AFK reveal completed for player ${player.id} (${player.name}) in game ${game.code}`,
        {
          gameCode: game.code,
          playerId: player.id,
          playerName: player.name,
          revealCount,
        },
      )

      this.warnPlayer(player)
      await this.updateAndSendGame(game, stateManager)
    } catch (error) {
      Logger.error(`Failed AFK reveal for player ${player.id}`, {
        gameCode: game.code,
        playerId: player.id,
        error: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }

  /**
   * Execute bot actions in sequence
   * Handles all bot action types and maps them to game methods
   *
   * Note: replaceCard() and turnCard() call finishTurn() which already handles
   * game updates and turn progression, so we don't need to update again after those.
   */
  private async executeBotActions(
    game: Game,
    currentPlayer: Player,
    actions: BotAction[],
    stateManager: GameStateTracker,
  ): Promise<void> {
    for (const action of actions) {
      switch (action.type) {
        case "pick-discard": {
          game.pickFromDiscard()
          await this.updateAndSendGame(game, stateManager)
          await new Promise((resolve) =>
            setTimeout(resolve, this.timeoutBetweenActions),
          )

          await game.replaceCard({
            column: action.replaceAt.col,
            row: action.replaceAt.row,
            wasAfk: true,
          })
          await this.updateAndSendGame(game, stateManager)
          break
        }

        case "pick-draw": {
          game.drawCard()
          await this.updateAndSendGame(game, stateManager)
          await new Promise((resolve) =>
            setTimeout(resolve, this.timeoutBetweenActions),
          )
          break
        }

        case "replace": {
          await game.replaceCard({
            column: action.position.col,
            row: action.position.row,
            wasAfk: true,
          })
          await this.updateAndSendGame(game, stateManager)
          break
        }

        case "discard": {
          if (game.selectedCardValue === null) {
            throw new Error(
              `Cannot discard: selectedCardValue is null in ${game.turnStatus} state`,
            )
          }
          game.discardCard(game.selectedCardValue)
          await this.updateAndSendGame(game, stateManager)
          await new Promise((resolve) =>
            setTimeout(resolve, this.timeoutBetweenActions),
          )
          break
        }

        case "turn": {
          await game.turnCard({
            player: currentPlayer,
            column: action.position.col,
            row: action.position.row,
            wasAfk: true,
          })
          await this.updateAndSendGame(game, stateManager)
          break
        }

        default: {
          Logger.warn(
            `Unknown bot action type: ${(action as BotAction).type}`,
            {
              gameCode: game.code,
              playerId: currentPlayer.id,
            },
          )
        }
      }
    }
  }
  //#endregion
}
