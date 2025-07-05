export interface ReportJobData {
  reportId: number
  reporterName: string
  reportedPlayerName: string
  reportedContent: string
  reportType: "name" | "message"
  gameCode: string
  reasonReported: string
  reportedAt: string
  aiValidation?: { safe: boolean; reason?: string }
  targetUserId?: number
}

export interface DiscordJobData {
  type: "report"
  data: ReportJobData
}

export type JobType = "discord:report"
