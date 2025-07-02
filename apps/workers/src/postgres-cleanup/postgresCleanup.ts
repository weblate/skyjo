import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { Queue } from "bullmq"

export const postgresCleanupQueue = new Queue<undefined>("postgres-cleanup", {
  connection: {
    url: ENV.REDIS_URL,
    enableOfflineQueue: true,
  },
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 1000,
    },
  },
})

export async function initializePostgresCleanupScheduler(): Promise<void> {
  try {
    await postgresCleanupQueue.upsertJobScheduler(
      "postgres-cleanup-scheduler",
      {
        pattern: "0 4 * * *", // Every day at 4AM (UTC)
      },
      {
        name: "postgres-cleanup",
        data: undefined,
        opts: {
          attempts: 3,
          removeOnComplete: 10,
          removeOnFail: 10,
        },
      },
    )

    Logger.info(
      "Postgres cleanup scheduler initialized - will run every day at 4AM UTC",
    )
  } catch (error) {
    Logger.error("Failed to initialize postgres cleanup scheduler", { error })
    throw error
  }
}
