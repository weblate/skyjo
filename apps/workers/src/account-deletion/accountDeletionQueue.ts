import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import type { AccountDeletionJobData } from "@skymo/worker-types"
import { Worker } from "bullmq"
import { AccountDeletionTask } from "./AccountDeletionTask.js"

/**
 * Worker that processes account deletion jobs
 */
export const createAccountDeletionWorker = (): Worker => {
  const worker = new Worker<AccountDeletionJobData>(
    "account-deletion",
    async (job) => {
      const { userId } = job.data

      try {
        Logger.info(`Processing account deletion job for user ${userId}`, {
          jobId: job.id,
          userId,
        })

        if (!job.id) {
          throw new Error("Job ID is required")
        }

        await AccountDeletionTask.processAccountDeletion(job.id, job.data)

        return { userId }
      } catch (error) {
        Logger.error(
          `Error processing account deletion job for user ${userId}`,
          {
            jobId: job.id,
            userId,
            error,
          },
        )
        throw error
      }
    },
    {
      connection: {
        url: ENV.REDIS_URL,
        enableOfflineQueue: true,
      },
      removeOnComplete: {
        age: 7 * 24 * 3600,
        count: 10,
      },
      removeOnFail: {
        age: 7 * 24 * 3600,
        count: 10,
      },
      concurrency: 1,
      lockDuration: 60000,
    },
  )

  worker.on("completed", (job) => {
    Logger.info(`Account deletion job ${job.id} completed`, { jobId: job.id })
  })

  worker.on("failed", (job, error) => {
    Logger.error(`Account deletion job ${job?.id} failed`, {
      jobId: job?.id,
      error: error.message,
      stack: error.stack,
    })
  })

  worker.on("error", (error) => {
    Logger.error("Account deletion worker error", {
      error: error.message,
      stack: error.stack,
    })
  })

  Logger.info("Account deletion worker initialized")
  return worker
}
