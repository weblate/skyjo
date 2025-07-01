import { ENV } from "@env"
import type { MailerJobData } from "@skymo/worker-types"
import { Queue } from "bullmq"

export const mailerQueue = new Queue<MailerJobData>("mailer", {
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
