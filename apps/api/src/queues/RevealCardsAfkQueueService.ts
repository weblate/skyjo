import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import type { Skyjo, SkyjoPlayer } from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import type { Job } from "bullmq"
import { BaseAfkQueueService } from "./BaseAfkQueueService.js"

export type RevealCardsAfkJobData = {
  gameCode: string
}

export class RevealCardsAfkQueueService extends BaseAfkQueueService<RevealCardsAfkJobData> {
  private static instance: RevealCardsAfkQueueService

  private constructor() {
    super("reveal-cards-afk-timer")
  }

  public static getInstance(): RevealCardsAfkQueueService {
    if (!RevealCardsAfkQueueService.instance) {
      RevealCardsAfkQueueService.instance = new RevealCardsAfkQueueService()
    }
    return RevealCardsAfkQueueService.instance
  }

  public async startTimer(game: Skyjo): Promise<void> {
    const timeoutDuration = this.getAfkTimeout(game)
    const jobId = this.getJobId(game.code)

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
  }

  async processJob(job: Job<RevealCardsAfkJobData>) {
    const { gameCode } = job.data

    const game = await this.redis.getGameSafe(gameCode)
    if (!game) {
      await job.moveToCompleted("Game not found", job?.token ?? "success")
      return
    }

    try {
      game.setOperationManager(GameOperationManager.getInstance())
      if (!game.isRoundRevealCards()) {
        await job.moveToCompleted(
          "Game is not in reveal cards round",
          job?.token ?? "success",
        )
        return
      }
      await this.lockGame(game)

      const stateManager = new GameStateTracker(game)

      const connectedPlayers = game.getConnectedPlayers()

      const initialTurnedCount = game.settings.initialTurnedCount

      for (const player of connectedPlayers) {
        if (player.hasRevealedCardCount(initialTurnedCount)) continue

        const disconnect = await this.increaseAfkCount(game, player)
        if (!disconnect) {
          await this.performAfkMove(game, player)
        }
      }

      await this.updateAndSendGame(game, stateManager)
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

  private getJobId(gameCode: string): string {
    return `game:${gameCode}`
  }

  private async performAfkMove(game: Skyjo, player: SkyjoPlayer) {
    const initialTurnedCount = game.settings.initialTurnedCount

    while (!player.hasRevealedCardCount(initialTurnedCount)) {
      const cardToRevealCoords = player.getFirstCardNotVisible()
      if (!cardToRevealCoords) break

      await game.revealCard({
        player,
        column: cardToRevealCoords.column,
        row: cardToRevealCoords.row,
        wasAfk: true,
      })
    }
  }
}
