import { GameRepository } from "@/redis/game.repository.js"

import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import type { Skyjo, SkyjoPlayer } from "@skyjo/core"
import { Constants as CoreConstants } from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import type { Job } from "bullmq"
import { BaseQueueService } from "./BaseQueueService.js"

export type PlayerAfkJobData = {
  gameCode: string
  playerId: string
}

export class PlayerAfkQueueService extends BaseQueueService<PlayerAfkJobData> {
  protected redis = new GameRepository()
  protected socketManager = SocketManager.getInstance()

  constructor() {
    super("player-afk-timer", {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    })
  }

  public async startTimer(game: Skyjo, playerId: string): Promise<void> {
    const timeoutDuration = game.settings.private
      ? CoreConstants.AFK_TIMEOUT.PRIVATE
      : CoreConstants.AFK_TIMEOUT.PUBLIC

    const jobId = this.getJobId(game.code, playerId)

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
  }

  public async cancelTimer(gameCode: string, playerId: string): Promise<void> {
    const jobId = this.getJobId(gameCode, playerId)
    await this.queue.remove(jobId)
  }

  async processJob(job: Job<PlayerAfkJobData>) {
    const { gameCode, playerId } = job.data

    const game = await this.redis.getGameSafe(gameCode)
    if (!game) {
      await job.moveToCompleted("Game not found", job?.token ?? "success")
      return
    }

    try {
      game.setOperationManager(
        new GameOperationManager({
          redis: this.redis,
          playerAfkQueue: this,
          socketManager: this.socketManager,
        }),
      )
      await this.lockGame(game)

      const player = game.getPlayerById(playerId)
      if (!player)
        throw new CError("Player not found", {
          code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        })

      const currentPlayer = game.getCurrentPlayer()

      if (currentPlayer?.id === playerId) {
        player.afkCount++
        player.consecutiveAfkCount++

        if (
          player.consecutiveAfkCount >=
            CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE ||
          player.afkCount >= CoreConstants.AFK_TIMEOUT.MAX_TOTAL
        ) {
          await this.disconnectPlayer(game, player)
        } else {
          await this.performAfkMove(game)
        }
      }
    } catch (error) {
      if (
        error instanceof CError &&
        error.code === ErrorConstants.ERROR.PLAYER_NOT_FOUND
      ) {
        await job.moveToCompleted(error.message, job?.token ?? "success")
      }
    } finally {
      await this.unlockGame(game)
    }
  }

  //#region private methods

  private async updateAndSendGame(game: Skyjo, stateManager: GameStateTracker) {
    const operations = stateManager.getChanges()
    if (!operations) return

    await this.redis.updateGame(game, operations)
    this.socketManager.sendToRoom({
      room: game.code,
      event: "game:update",
      data: [operations],
    })
  }

  private getJobId(gameCode: string, playerId: string): string {
    return `afk:${gameCode}:${playerId}`
  }

  private async disconnectPlayer(game: Skyjo, player: SkyjoPlayer) {
    const stateManager = new GameStateTracker(game)

    await game.disconnectPlayer(player)

    await this.updateAndSendGame(game, stateManager)
  }

  private async performAfkMove(game: Skyjo) {
    const stateManager = new GameStateTracker(game)

    const currentPlayer = game.getCurrentPlayer()

    if (game.turnStatus === CoreConstants.TURN_STATUS.CHOOSE_A_PILE) {
      game.drawCard()

      await this.updateAndSendGame(game, stateManager)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    const cardCoords = currentPlayer.getFirstCardNotVisible()
    if (!cardCoords) throw new Error("SHOULD NOT HAPPEN")

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

    await this.updateAndSendGame(game, stateManager)
  }

  private async lockGame(game: Skyjo) {
    if (game.processingAfk) {
      throw new CError("Game is already processing afk", {
        code: ErrorConstants.ERROR.GAME_ALREADY_PROCESSING_AFK,
      })
    }

    game.processingAfk = true
    await this.redis.updateGame(game)
  }

  private async unlockGame(game: Skyjo) {
    game.processingAfk = false
    await this.redis.updateGame(game)
  }

  //#endregion
}
