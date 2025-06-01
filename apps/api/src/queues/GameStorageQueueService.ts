import { ENV } from "@env"
import type { GameRedisDb } from "@skymo/core"
import { Logger } from "@skymo/logger"
import type { GameStorageJobData } from "@skymo/worker-types"
import { Queue } from "bullmq"

export class GameStorageQueueService {
  private static instance: GameStorageQueueService | null = null
  private readonly queue: Queue<GameStorageJobData>

  private constructor() {
    this.queue = new Queue<GameStorageJobData>("game-storage", {
      connection: {
        url: ENV.REDIS_URL,
        enableOfflineQueue: true,
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 50,
        removeOnFail: 50,
      },
    })

    Logger.info("GameStorageQueueService initialized")
  }

  public static getInstance(): GameStorageQueueService {
    if (!GameStorageQueueService.instance) {
      GameStorageQueueService.instance = new GameStorageQueueService()
    }
    return GameStorageQueueService.instance
  }

  public static exists(): boolean {
    return GameStorageQueueService.instance !== null
  }

  public async storeGame(game: GameRedisDb): Promise<void> {
    await this.queue.add(
      `store-game-${game.code}`,
      { game },
      {
        jobId: `store-game-${game.code}-${Date.now()}`,
      },
    )

    Logger.info(`Added game storage job for game ${game.code}`, {
      gameCode: game.code,
      gameId: game.id,
    })
  }

  public async cleanup(): Promise<void> {
    Logger.info("Cleaning up GameStorageQueueService")
    await this.queue.close()
  }
}
