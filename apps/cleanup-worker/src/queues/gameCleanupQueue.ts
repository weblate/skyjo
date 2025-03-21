import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { type Job, Worker } from "bullmq"
import {
  type GameCleanupData,
  GameCleanupTask,
} from "../tasks/GameCleanupTask.js"

/**
 * Worker that processes game cleanup jobs
 */
export const createGameCleanupWorker = (): Worker => {
  const worker = new Worker<GameCleanupData>(
    "game-cleanup",
    async (job: Job<GameCleanupData>) => {
      const { gameCode } = job.data

      try {
        Logger.info(`Processing cleanup job for game ${gameCode}`, {
          jobId: job.id,
          gameCode,
        })

        const result = await GameCleanupTask.cleanupGame(gameCode)

        return result
      } catch (error) {
        Logger.error(`Error processing cleanup job for game ${gameCode}`, {
          jobId: job.id,
          gameCode,
          error,
        })
        throw error
      }
    },
    {
      connection: {
        url: ENV.REDIS_URL,
        enableOfflineQueue: false,
      },
      removeOnComplete: {
        age: 3600,
        count: 50,
      },
      removeOnFail: {
        age: 3600,
        count: 50,
      },
      concurrency: 2,
      lockDuration: 30000,
    },
  )

  worker.on("completed", (job) => {
    Logger.info(`Job ${job.id} completed`, { jobId: job.id })
  })

  worker.on("failed", (job, error) => {
    Logger.error(`Job ${job?.id} failed`, {
      jobId: job?.id,
      error: error.message,
      stack: error.stack,
    })
  })

  worker.on("error", (error) => {
    Logger.error("Worker error", { error: error.message, stack: error.stack })
  })

  Logger.info("Game cleanup worker initialized")
  return worker
}
