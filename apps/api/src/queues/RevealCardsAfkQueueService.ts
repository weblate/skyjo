import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import type { Skyjo, SkyjoPlayer } from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import { Logger } from "@skyjo/logger"
import type { Job } from "bullmq"
import { BaseAfkQueueService } from "./BaseAfkQueueService.js"

export type RevealCardsAfkJobData = {
  gameCode: string
}

export class RevealCardsAfkQueueService extends BaseAfkQueueService<RevealCardsAfkJobData> {
  private static instance: RevealCardsAfkQueueService

  private constructor() {
    super("reveal-cards-afk-timer")
    Logger.info("RevealCardsAfkQueueService singleton initialized")
  }

  public static getInstance(): RevealCardsAfkQueueService {
    if (!RevealCardsAfkQueueService.instance) {
      RevealCardsAfkQueueService.instance = new RevealCardsAfkQueueService()
    }
    return RevealCardsAfkQueueService.instance
  }

  public static exists(): boolean {
    return RevealCardsAfkQueueService.instance !== null
  }

  public async startTimer(game: Skyjo): Promise<void> {
    const timeoutDuration = this.getAfkTimeout(game)
    const jobId = this.getJobId(game.code)

    Logger.info(`Starting reveal cards AFK timer for game ${game.code}`, {
      gameCode: game.code,
      timeoutDuration,
      jobId,
    })

    try {
      await this.queue.add(
        jobId,
        { gameCode: game.code },
        {
          delay: timeoutDuration,
          jobId,
          removeOnComplete: true,
          removeOnFail: true,
        },
      )

      Logger.debug(`Reveal cards AFK timer started for game ${game.code}`, {
        gameCode: game.code,
        timeoutDuration,
        jobId,
      })
    } catch (error) {
      Logger.error(
        `Failed to start reveal cards AFK timer for game ${game.code}`,
        {
          gameCode: game.code,
          error,
        },
      )
    }
  }

  public async cancelTimer(gameCode: string): Promise<void> {
    const jobId = this.getJobId(gameCode)

    Logger.debug(`Cancelling reveal cards AFK timer for game ${gameCode}`, {
      gameCode,
      jobId,
    })

    try {
      await this.queue.remove(jobId)

      Logger.debug(`Reveal cards AFK timer cancelled for game ${gameCode}`, {
        gameCode,
        jobId,
      })
    } catch (error) {
      Logger.error(
        `Failed to cancel reveal cards AFK timer for game ${gameCode}`,
        {
          gameCode,
          error,
        },
      )
    }
  }

  async processJob(job: Job<RevealCardsAfkJobData>) {
    const { gameCode } = job.data

    Logger.info(`Processing reveal cards AFK job for game ${gameCode}`, {
      gameCode,
      jobId: job.id,
    })

    const game = await this.redis.getGameSafe(gameCode)
    if (!game) return

    try {
      await this.lockGame(game)
      game.setOperationManager(GameOperationManager.getInstance())

      if (!game.isPlaying() || !game.isRoundRevealCards()) {
        Logger.info(
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

      const initialTurnedCount = game.settings.initialTurnedCount

      for (const player of connectedPlayers) {
        if (player.hasRevealedCardCount(initialTurnedCount)) {
          Logger.debug(
            `Player ${player.id} (${player.name}) already revealed required cards in game ${gameCode}`,
            {
              gameCode,
              playerId: player.id,
              playerName: player.name,
              revealedCount: initialTurnedCount,
              requiredCount: initialTurnedCount,
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
      if (
        error instanceof CError &&
        error.code === ErrorConstants.ERROR.PLAYER_NOT_FOUND
      ) {
        return
      }

      await job.moveToFailed(
        error instanceof Error ? error : new Error(String(error)),
        job?.token ?? "failed",
      )
    } finally {
      await this.unlockGame(game)
    }
  }

  private getJobId(gameCode: string): string {
    return `game:${gameCode}`
  }

  private async performAfkMove(game: Skyjo, player: SkyjoPlayer) {
    const initialTurnedCount = game.settings.initialTurnedCount

    Logger.info(
      `Performing AFK reveal for player ${player.id} (${player.name}) in game ${game.code}`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
        targetRevealedCount: initialTurnedCount,
      },
    )

    while (!player.hasRevealedCardCount(initialTurnedCount)) {
      const cardToRevealCoords = player.getFirstCardNotVisible()
      if (!cardToRevealCoords) break

      Logger.info(
        `Revealing card at ${cardToRevealCoords.column},${cardToRevealCoords.row} for AFK player ${player.id} (${player.name}) in game ${game.code}`,
        {
          gameCode: game.code,
          playerId: player.id,
          playerName: player.name,
          cardColumn: cardToRevealCoords.column,
          cardRow: cardToRevealCoords.row,
        },
      )

      await game.revealCard({
        player,
        column: cardToRevealCoords.column,
        row: cardToRevealCoords.row,
        wasAfk: true,
      })
    }

    Logger.info(
      `AFK reveal completed for player ${player.id} (${player.name}) in game ${game.code}`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
      },
    )
  }
}
