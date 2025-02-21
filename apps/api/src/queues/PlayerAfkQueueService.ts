import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import type { Skyjo } from "@skyjo/core"
import { Constants as CoreConstants } from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
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
  }

  public static getInstance(): PlayerAfkQueueService {
    if (!PlayerAfkQueueService.instance) {
      PlayerAfkQueueService.instance = new PlayerAfkQueueService()
    }
    return PlayerAfkQueueService.instance
  }

  public async startTimer(game: Skyjo, playerId: string): Promise<void> {
    const timeoutDuration = this.getAfkTimeout(game)
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
      game.setOperationManager(GameOperationManager.getInstance())
      await this.lockGame(game)

      const player = game.getPlayerById(playerId)
      if (!player)
        throw new CError("Player not found", {
          code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        })

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
        await job.moveToCompleted(error.message, job?.token ?? "success")
      }
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

    this.warnPlayer(currentPlayer)

    await this.updateAndSendGame(game, stateManager)
  }

  //#endregion
}
