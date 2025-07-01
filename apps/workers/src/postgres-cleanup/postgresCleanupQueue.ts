import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { Worker } from "bullmq"
import { PostgresCleanupTask } from "./PostgresCleanupTask.js"

/**
 * Worker that processes postgres cleanup jobs
 */
export const createPostgresCleanupWorker = (): Worker => {
  const worker = new Worker<undefined>(
    "postgres-cleanup",
    async (job) => {
      try {
        Logger.info(`Processing postgres cleanup job`, {
          jobId: job.id,
        })

        const result = await PostgresCleanupTask.runPostgresCleanup()

        return result
      } catch (error) {
        Logger.error(`Error processing postgres cleanup job`, {
          jobId: job.id,
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
    },
  )

  worker.on("completed", (job) => {
    Logger.info(`Postgres cleanup job ${job.id} completed`, { jobId: job.id })
  })

  worker.on("failed", (job, error) => {
    Logger.error(`Postgres cleanup job ${job?.id} failed`, {
      jobId: job?.id,
      error: error.message,
      stack: error.stack,
    })
  })

  worker.on("error", (error) => {
    Logger.error("Postgres cleanup worker error", {
      error: error.message,
      stack: error.stack,
    })
  })

  Logger.info("Postgres cleanup worker initialized")
  return worker
}
