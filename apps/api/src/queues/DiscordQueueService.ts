import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { Queue } from "bullmq"

export interface ReportJobData {
  reportId: number
  reporterName: string
  reportedPlayerName: string
  reportedContent: string
  reportType: "name" | "message"
  gameCode: string
  reportedAt: string
  aiValidation?: { safe: boolean; reason?: string }
  targetUserId?: number
}

export class DiscordQueueService {
  private static instance: DiscordQueueService | null = null
  private readonly queue: Queue<ReportJobData>

  private constructor() {
    this.queue = new Queue<ReportJobData>("discord-add-report-message", {
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

    Logger.info("DiscordQueueService initialized")
  }

  public static getInstance(): DiscordQueueService {
    DiscordQueueService.instance ??= new DiscordQueueService()

    return DiscordQueueService.instance
  }

  public static exists(): boolean {
    return DiscordQueueService.instance !== null
  }

  public async sendReportNotification(
    reportData: ReportJobData,
  ): Promise<void> {
    try {
      const job = await this.queue.add("discord:report", reportData, {
        priority: 1,
      })

      Logger.info(
        `Added Discord report job for report #${reportData.reportId}`,
        {
          jobId: job.id,
          reportId: reportData.reportId,
          gameCode: reportData.gameCode,
        },
      )
    } catch (error) {
      Logger.error("Failed to add Discord report job", {
        reportId: reportData.reportId,
        error,
      })
      throw error
    }
  }

  public async cleanup(): Promise<void> {
    Logger.info("Cleaning up DiscordQueueService")
    await this.queue.close()
  }
}
