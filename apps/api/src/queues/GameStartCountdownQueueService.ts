import { GameRepository } from "@/redis/game.repository.js"
import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import { type Game } from "@skymo/core"
import { Logger } from "@skymo/logger"
import type { Job } from "bullmq"
import { BaseQueueService } from "./BaseQueueService.js"

export interface GameStartCountdownJobData {
  gameCode: string
  endTimestamp: number
}

export class GameStartCountdownQueueService extends BaseQueueService<GameStartCountdownJobData> {
  private static instance: GameStartCountdownQueueService | null = null
  private readonly gameRepository = new GameRepository()
  private readonly socketManager = SocketManager.getInstance()
  private readonly COUNTDOWN_MS = 5000

  private constructor() {
    super("game-start-countdown", {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    })
  }

  static getInstance(): GameStartCountdownQueueService {
    GameStartCountdownQueueService.instance =
      GameStartCountdownQueueService.instance ??
      new GameStartCountdownQueueService()

    return GameStartCountdownQueueService.instance
  }

  static exists(): boolean {
    return !!GameStartCountdownQueueService.instance
  }

  async startCountdown(gameCode: string): Promise<void> {
    await this.cancelCountdown(gameCode)

    const endTimestamp = Date.now() + this.COUNTDOWN_MS

    this.socketManager.sendToRoom({
      room: gameCode,
      event: "game:countdown-started",
      data: [endTimestamp],
    })

    await this.queue.add(
      `game-start-countdown-${gameCode}`,
      { gameCode, endTimestamp },
      {
        delay: this.COUNTDOWN_MS,
        jobId: `game-start-countdown-${gameCode}`,
      },
    )

    Logger.debug(`Added game start countdown job for game ${gameCode}`, {
      gameCode,
      delay: this.COUNTDOWN_MS,
      endTimestamp,
    })
  }

  async cancelCountdown(gameCode: string): Promise<void> {
    const jobId = `game-start-countdown-${gameCode}`
    await this.queue.remove(jobId)

    this.socketManager.sendToRoom({
      room: gameCode,
      event: "game:countdown-canceled",
      data: [],
    })

    Logger.debug(`Cancelled game start countdown job for game ${gameCode}`, {
      gameCode,
      jobId,
    })
  }

  protected async processJob(
    job: Job<GameStartCountdownJobData>,
  ): Promise<void> {
    const { gameCode } = job.data

    Logger.info(`Processing game start countdown for game ${gameCode}`, {
      gameCode,
    })

    try {
      const game = await this.getGame(gameCode)

      const stateManager = new GameStateTracker(game)

      await game.start()

      const operations = stateManager.getChanges()
      if (operations) {
        await this.gameRepository.updateGame(game, operations)

        this.socketManager.sendToRoom({
          room: gameCode,
          event: "game:update",
          data: [operations],
        })
      }

      Logger.info(`Game ${gameCode} started after countdown`, {
        gameCode,
      })
    } catch (error) {
      Logger.error(`Error starting game ${gameCode} after countdown`, {
        error,
        gameCode,
      })
      throw error
    }
  }

  private async getGame(gameCode: string): Promise<Game> {
    const game = await this.gameRepository.getGame(gameCode)
    game.setOperationManager(GameOperationManager.getInstance())
    return game
  }
}
