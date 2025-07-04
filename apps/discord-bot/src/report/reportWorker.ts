import { DiscordClient } from "@/discord.js"
import { sendReportMessage } from "@/report/reportTask.js"
import { Logger } from "@skymo/logger"
import { Job, Worker } from "bullmq"
import { ENV } from "../../env.js"
import type { ReportJobData } from "../types/jobs.js"

export class ReportMessageWorker {
  private readonly worker: Worker
  private readonly discordClient: DiscordClient = DiscordClient.getInstance()

  constructor() {
    this.worker = new Worker<ReportJobData>(
      "discord-add-report-message",
      this.processJob,
      {
        connection: {
          url: ENV.REDIS_URL,
          enableOfflineQueue: true,
        },
        concurrency: 1,
        removeOnComplete: { count: 20, age: 15 * 60 },
        removeOnFail: { count: 20, age: 15 * 60 },
      },
    )

    this.setupEventHandlers()
  }

  private setupEventHandlers(): void {
    this.worker.on("completed", (job) => {
      Logger.info(`Discord job ${job.id} completed successfully`)
    })

    this.worker.on("failed", (job, err) => {
      Logger.error(`Discord job ${job?.id} failed:`, { err })
    })

    this.worker.on("error", (err) => {
      Logger.error("Discord worker error:", { err })
    })

    // Graceful shutdown handling
    process.on("SIGTERM", () => this.shutdown())
    process.on("SIGINT", () => this.shutdown())
  }

  private async processJob(job: Job<ReportJobData>): Promise<void> {
    try {
      await sendReportMessage(job.data)
    } catch (error) {
      Logger.error("Failed to handle report job:", { error })
      throw error
    }
  }

  async shutdown(): Promise<void> {
    Logger.info("Shutting down Discord worker...")

    try {
      await this.worker.close()
      await this.discordClient.destroy()
      Logger.info("Discord worker shutdown complete")
      process.exit(0)
    } catch (error) {
      Logger.error("Error during shutdown:", { error })
      process.exit(1)
    }
  }
}
