import type { Game, Player } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import type { Job } from "bullmq"
import { GameOperationManager } from "@/realtime/utils/GameOperationManager.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { BaseAfkQueueService } from "./BaseAfkQueueService.js"

export interface RevealCardsAfkJobData {
  gameCode: string
}

export class RevealCardsAfkQueueService extends BaseAfkQueueService<RevealCardsAfkJobData> {
  private static instance: RevealCardsAfkQueueService

  private constructor() {
    super("reveal-cards-afk-timer")
    Logger.info("RevealCardsAfkQueueService singleton initialized")
  }

  public static getInstance(): RevealCardsAfkQueueService {
    RevealCardsAfkQueueService.instance ??= new RevealCardsAfkQueueService()

    return RevealCardsAfkQueueService.instance
  }

  public static exists(): boolean {
    return RevealCardsAfkQueueService.instance !== null
  }

  public async startTimer(game: Game): Promise<void> {
    const timeoutDuration = this.getAfkTimeout(game)
    const jobId = this.getJobId(game.code)

    Logger.info(`Starting reveal cards AFK timer for game ${game.code}`, {
      gameCode: game.code,
      timeoutDuration,
      jobId,
    })

    try {
      const job = await this.queue.add(
        jobId,
        { gameCode: game.code },
        {
          delay: timeoutDuration,
          jobId,
          removeOnComplete: true,
          removeOnFail: 50,
        },
      )

      if (!job) {
        throw new Error("Failed to create reveal cards AFK timer job")
      }

      Logger.info(`Reveal cards AFK timer started for game ${game.code}`, {
        gameCode: game.code,
        timeoutDuration,
        jobId: job.id,
        scheduledFor: job.timestamp + timeoutDuration,
      })
    } catch (error) {
      Logger.error(
        `Failed to start reveal cards AFK timer for game ${game.code}`,
        {
          gameCode: game.code,
          error,
        },
      )
      throw error
    }
  }

  public async cancelTimer(gameCode: string): Promise<void> {
    const jobId = this.getJobId(gameCode)

    Logger.info(`Cancelling reveal cards AFK timer for game ${gameCode}`, {
      gameCode,
      jobId,
    })

    let retryCount = 0
    const maxRetries = 3

    while (retryCount < maxRetries) {
      try {
        const job = await this.queue.getJob(jobId)
        if (job) {
          await job.remove()
          Logger.debug(
            `Successfully cancelled reveal cards AFK timer for game ${gameCode}`,
            {
              gameCode,
              jobId,
              attempt: retryCount + 1,
            },
          )
          return
        } else {
          Logger.debug(`No reveal cards AFK timer found for game ${gameCode}`, {
            gameCode,
            jobId,
          })
          return
        }
      } catch (error) {
        retryCount++
        if (retryCount >= maxRetries) {
          Logger.error(
            `Failed to cancel reveal cards AFK timer for game ${gameCode} after ${maxRetries} attempts`,
            {
              error,
              gameCode,
              jobId,
              attempts: retryCount,
            },
          )
        } else {
          Logger.warn(
            `Failed to cancel reveal cards AFK timer, retrying... (${retryCount}/${maxRetries})`,
            {
              error,
              gameCode,
              jobId,
            },
          )
          // Wait a bit before retrying
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }
    }
  }

  async processJob(job: Job<RevealCardsAfkJobData>) {
    const { gameCode } = job.data

    Logger.info(`Processing reveal cards AFK job for game ${gameCode}`, {
      gameCode,
      jobId: job.id,
    })

    const game = await this.redis.getGameSafe(gameCode)
    if (!game) {
      Logger.warn(
        `Game ${gameCode} not found in Redis, skipping reveal cards AFK job`,
        {
          gameCode,
          jobId: job.id,
        },
      )
      return
    }

    let lockAcquired = false

    try {
      await this.lockGame(game)
      lockAcquired = true

      game.setOperationManager(GameOperationManager.getInstance())

      if (!game.isPlaying() || !game.isRoundRevealCards()) {
        Logger.debug(
          `Game ${gameCode} is not in playing state or not in reveal cards round, skipping AFK job`,
          {
            gameCode,
            jobId: job.id,
            isPlaying: game.isPlaying(),
            isRoundRevealCards: game.isRoundRevealCards(),
          },
        )
        return
      }

      const stateManager = new GameStateTracker(game)

      const connectedPlayers = game.getConnectedPlayers()
      Logger.info(
        `Processing ${connectedPlayers.length} connected players for reveal cards AFK in game ${gameCode}`,
        {
          gameCode,
          jobId: job.id,
          connectedPlayerCount: connectedPlayers.length,
        },
      )

      for (const player of connectedPlayers) {
        if (player.hasRevealedCardCount) {
          Logger.debug(
            `Player ${player.id} (${player.name}) already revealed required cards in game ${gameCode}`,
            {
              gameCode,
              playerId: player.id,
              playerName: player.name,
              revealedCount: player.hasRevealedCardCount,
              requiredCount: game.settings.initialTurnedCount,
            },
          )
          continue
        }

        const disconnect = await this.increaseAfkCount(game, player)
        if (!disconnect) {
          await this.performAfkMove(game, player)
          this.warnPlayer(player)
        }
      }

      await this.updateAndSendGame(game, stateManager)
    } catch (error) {
      Logger.error(
        `Error processing reveal cards AFK job for game ${gameCode}`,
        {
          gameCode,
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

  private getJobId(gameCode: string): string {
    return `game:${gameCode}`
  }

  private async performAfkMove(game: Game, player: Player) {
    Logger.info(
      `Performing AFK reveal for player ${player.id} (${player.name}) in game ${game.code}`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
      },
    )

    const maxAttempts = 12
    let attempts = 0
    const attemptedCards = new Set<string>()

    while (!player.hasRevealedCardCount && attempts < maxAttempts) {
      const cardToRevealCoords = player.getFirstCardNotVisible()
      if (!cardToRevealCoords) break

      const cardKey = `${cardToRevealCoords.column},${cardToRevealCoords.row}`

      if (attemptedCards.has(cardKey)) {
        Logger.warn(
          `Detected repeat attempt to reveal the same card at ${cardKey} for player ${player.id} in game ${game.code}`,
          {
            gameCode: game.code,
            playerId: player.id,
            playerName: player.name,
            cardCoords: cardKey,
          },
        )
        break
      }

      attemptedCards.add(cardKey)
      attempts++

      Logger.info(
        `Revealing card at ${cardToRevealCoords.column},${cardToRevealCoords.row} for AFK player ${player.id} (${player.name}) in game ${game.code}`,
        {
          gameCode: game.code,
          playerId: player.id,
          playerName: player.name,
          cardColumn: cardToRevealCoords.column,
          cardRow: cardToRevealCoords.row,
          attemptNumber: attempts,
        },
      )

      try {
        await game.revealCard({
          player,
          column: cardToRevealCoords.column,
          row: cardToRevealCoords.row,
          wasAfk: true,
        })
      } catch (error) {
        Logger.error(
          `Failed to reveal card at ${cardKey} for player ${player.id} in game ${game.code}`,
          {
            gameCode: game.code,
            playerId: player.id,
            error,
          },
        )
        break
      }
    }

    if (attempts >= maxAttempts) {
      throw new CError(
        `Hit maximum reveal attempts for AFK player ${player.id} in game ${game.code}`,
        {
          level: "warn",
          code: ErrorConstants.ERROR.UNEXPECTED_ERROR,
          meta: {
            gameCode: game.code,
            playerId: player.id,
            playerName: player.name,
            maxAttempts,
          },
        },
      )
    }

    Logger.info(
      `AFK reveal completed for player ${player.id} (${player.name}) in game ${game.code}`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
        attempts,
      },
    )
  }
}
