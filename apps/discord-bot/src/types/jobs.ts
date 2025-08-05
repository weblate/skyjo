import type { ReportJobData } from "@skymo/worker-types"

export interface DiscordJobData {
  type: "report"
  data: ReportJobData
}

export type JobType = "discord:report"
