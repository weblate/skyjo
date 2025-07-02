import z from "zod"

export const report = z.object({
  targetId: z.string(),
})

export const reportName = report.extend({
  type: z.literal("name"),
})

export const reportMessage = report.extend({
  type: z.literal("message"),
  messageId: z.string().uuid(),
})

export type ReportName = z.infer<typeof reportName>
export type ReportMessage = z.infer<typeof reportMessage>

export type Report = ReportName | ReportMessage
