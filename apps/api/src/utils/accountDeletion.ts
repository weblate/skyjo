import { ENV } from "@env"
import type { AccountDeletionJobData } from "@skymo/worker-types"
import { Queue } from "bullmq"

export const accountDeletionQueue = new Queue<AccountDeletionJobData>(
  "account-deletion",
  {
    connection: {
      url: ENV.REDIS_URL,
      enableOfflineQueue: true,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 1000,
      },
    },
  },
)
