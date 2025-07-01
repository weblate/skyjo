import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import type { MailerJobData } from "@skymo/worker-types"
import { type Job, Worker } from "bullmq"
import { MailerTask } from "./mailerTask.js"

const mailerTask = new MailerTask()
/**
 * Worker that processes email jobs
 */
export const createMailerWorker = (): Worker => {
  const worker = new Worker<MailerJobData>(
    "mailer",
    async (job: Job<MailerJobData>) => {
      const { to, template, content } = job.data

      try {
        Logger.info(`Processing email job for ${to}`, {
          jobId: job.id,
          to,
          template,
          content,
        })

        await mailerTask.sendEmail(job.data)
      } catch (error) {
        Logger.error(`Error processing email for ${to}`, {
          jobId: job.id,
          to,
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

  Logger.info("Mailer worker initialized")
  return worker
}
