import z from "zod"

export const report = z.object({
  targetId: z.string(),
})

export const reportUsername = report.extend({
  type: z.literal("username"),
})

export const reportMessage = report.extend({
  type: z.literal("message"),
  messageId: z.string().uuid(),
})

export type ReportUsername = z.infer<typeof reportUsername>
export type ReportMessage = z.infer<typeof reportMessage>

export type Report = ReportUsername | ReportMessage
