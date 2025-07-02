import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import type { GameStorageJobData } from "@skymo/worker-types"
import { Worker } from "bullmq"
import { GameStorageTask } from "./GameStorageTask.js"

/**
 * Worker that processes game storage jobs
 */
export const createGameStorageWorker = (): Worker => {
  const worker = new Worker<GameStorageJobData>(
    "game-storage",
    async (job) => {
      const { game } = job.data

      try {
        Logger.info(`Processing storage job for game ${game.code}`, {
          jobId: job.id,
          gameCode: game.code,
          gameId: game.id,
        })

        await GameStorageTask.storeGame(job.data)

        return { gameCode: game.code, gameId: game.id }
      } catch (error) {
        Logger.error(`Error processing storage job for game ${game.code}`, {
          jobId: job.id,
          gameCode: game.code,
          gameId: game.id,
          error,
        })
        throw error
      }
    },
    {
      connection: {
        url: ENV.REDIS_URL,
        enableOfflineQueue: true,
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
    Logger.info(`Game storage job ${job.id} completed`, { jobId: job.id })
  })

  worker.on("failed", (job, error) => {
    Logger.error(`Game storage job ${job?.id} failed`, {
      jobId: job?.id,
      error: error.message,
      stack: error.stack,
    })
  })

  worker.on("error", (error) => {
    Logger.error("Game storage worker error", {
      error: error.message,
      stack: error.stack,
    })
  })

  Logger.info("Game storage worker initialized")
  return worker
}
