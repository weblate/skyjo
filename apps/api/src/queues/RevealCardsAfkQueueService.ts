import { GameRepository } from "@/redis/game.repository.js"

import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import type { Skyjo } from "@skyjo/core"
import { Constants as CoreConstants } from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import type { Job } from "bullmq"
import { BaseQueueService } from "./BaseQueueService.js"

export type RevealCardsAfkJobData = {
  gameCode: string
}

export class RevealCardsAfkQueueService extends BaseQueueService<RevealCardsAfkJobData> {
  protected redis = new GameRepository()
  protected socketManager = SocketManager.getInstance()

  constructor() {
    super("reveal-cards-afk-timer", {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    })
  }

  public async startTimer(game: Skyjo): Promise<void> {
    const timeoutDuration = game.settings.private
      ? CoreConstants.AFK_TIMEOUT.PRIVATE
      : CoreConstants.AFK_TIMEOUT.PUBLIC

    const jobId = this.getJobId(game.code)

    await this.queue.add(
      jobId,
      {
        gameCode: game.code,
      },
      {
        delay: timeoutDuration,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    )
  }

  async processJob(job: Job<RevealCardsAfkJobData>) {
    const { gameCode } = job.data

    const game = await this.redis.getGameSafe(gameCode)
    if (!game) {
      await job.moveToCompleted("Game not found", job?.token ?? "success")
      return
    }

    try {
      game.setOperationManager(
        new GameOperationManager({
          redis: this.redis,
          revealCardsAfkQueue: this,
          socketManager: this.socketManager,
        }),
      )
      if (!game.isRoundRevealCards()) {
        await job.moveToCompleted(
          "Game is not in reveal cards round",
          job?.token ?? "success",
        )
        return
      }
      await this.lockGame(game)

      await this.performAfkMove(game)
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

  private getJobId(gameCode: string): string {
    return `afk:${gameCode}:reveal`
  }

  private async performAfkMove(game: Skyjo) {
    const stateManager = new GameStateTracker(game)

    const connectedPlayers = game.getConnectedPlayers()

    const initialTurnedCount = game.settings.initialTurnedCount

    for (const player of connectedPlayers) {
      if (player.hasRevealedCardCount(initialTurnedCount)) continue

      player.afkCount++
      player.consecutiveAfkCount++

      while (!player.hasRevealedCardCount(initialTurnedCount)) {
        const cardToRevealCoords = player.getFirstCardNotVisible()
        if (!cardToRevealCoords) break

        game.revealCard(
          player,
          cardToRevealCoords.column,
          cardToRevealCoords.row,
        )
      }
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
