import type { Report } from "@/validations/report.js"

export interface ClientToServerReportEvents {
  report: (report: Report) => void
}
