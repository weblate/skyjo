import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import type { Skyjo } from "@skyjo/core"
import { Constants as CoreConstants } from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import { Logger } from "@skyjo/logger"
import type { Job } from "bullmq"
import { BaseAfkQueueService } from "./BaseAfkQueueService.js"

export type PlayerAfkJobData = {
  gameCode: string
  playerId: string
}

export class PlayerAfkQueueService extends BaseAfkQueueService<PlayerAfkJobData> {
  private static instance: PlayerAfkQueueService

  private constructor() {
    super("player-afk-timer")
    Logger.info("PlayerAfkQueueService singleton initialized")
  }

  public static getInstance(): PlayerAfkQueueService {
    if (!PlayerAfkQueueService.instance) {
      PlayerAfkQueueService.instance = new PlayerAfkQueueService()
    }
    return PlayerAfkQueueService.instance
  }

  public static exists(): boolean {
    return PlayerAfkQueueService.instance !== null
  }

  public async startTimer(game: Skyjo, playerId: string): Promise<void> {
    const timeoutDuration = this.getAfkTimeout(game)
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
      await this.queue.add(
        jobId,
        {
          gameCode: game.code,
          playerId: playerId,
        },
        {
          delay: timeoutDuration,
          jobId,
          removeOnComplete: true,
          removeOnFail: true,
        },
      )

      Logger.info(
        `AFK timer started for player ${playerId} in game ${game.code}`,
        {
          gameCode: game.code,
          playerId,
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

    try {
      await this.queue.remove(jobId)
    } catch (error) {
      Logger.error(
        `Failed to cancel AFK timer for player ${playerId} in game ${gameCode}`,
        { error },
      )
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
    if (!game) return

    try {
      game.setOperationManager(GameOperationManager.getInstance())
      if (!game.isPlaying() || !game.isRoundInMain()) {
        Logger.debug(
          `Game ${gameCode} is not in playing state or not in main round, skipping AFK job`,
          {
            gameCode,
            playerId,
            jobId: job.id,
            isPlaying: game.isPlaying(),
            isRoundInMain: game.isRoundInMain(),
          },
        )
        return
      }

      await this.lockGame(game)

      const player = game.getPlayerById(playerId)
      if (!player) {
        Logger.debug(`Player ${playerId} not found in game ${gameCode}`, {
          gameCode,
          playerId,
          jobId: job.id,
        })
        return
      }
      const currentPlayer = game.getCurrentPlayer()

      if (currentPlayer?.id === playerId) {
        const disconnect = await this.increaseAfkCount(game, player)

        if (!disconnect) {
          await this.performAfkMove(game)
        }
      }
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

  //#region private methods

  private getJobId(gameCode: string, playerId: string): string {
    return `game:${gameCode}:player:${playerId}`
  }

  private async performAfkMove(game: Skyjo) {
    const stateManager = new GameStateTracker(game)

    const currentPlayer = game.getCurrentPlayer()
    Logger.info(
      `Performing AFK move for player ${currentPlayer.id} (${currentPlayer.name}) in game ${game.code}`,
      {
        gameCode: game.code,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
        turnStatus: game.turnStatus,
      },
    )

    if (game.turnStatus === CoreConstants.TURN_STATUS.CHOOSE_A_PILE) {
      game.drawCard()

      await this.updateAndSendGame(game, stateManager)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    const cardCoords = currentPlayer.getFirstCardNotVisible()
    if (!cardCoords) throw new Error("No card to reveal. SHOULD NOT HAPPEN")

    if (
      game.turnStatus === CoreConstants.TURN_STATUS.THROW_OR_REPLACE ||
      game.turnStatus === CoreConstants.TURN_STATUS.REPLACE_A_CARD
    ) {
      await game.replaceCard({
        column: cardCoords.column,
        row: cardCoords.row,
        wasAfk: true,
      })
    } else {
      await game.turnCard({
        player: currentPlayer,
        column: cardCoords.column,
        row: cardCoords.row,
        wasAfk: true,
      })
    }

    this.warnPlayer(currentPlayer)

    await this.updateAndSendGame(game, stateManager)

    Logger.info(
      `AFK move completed for player ${currentPlayer.id} (${currentPlayer.name}) in game ${game.code}`,
      {
        gameCode: game.code,
        playerId: currentPlayer.id,
        playerName: currentPlayer.name,
      },
    )
  }

  //#endregion
}
