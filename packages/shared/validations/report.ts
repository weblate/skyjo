import z from "zod"

export const reportReasons = [
  "inappropriate-username",
  "toxic-behavior",
  "spam-advertising",
  "cheating-exploiting",
  "harassment",
  "other",
] as const

export const report = z.object({
  targetId: z.string(),
  reason: z.enum(reportReasons),
  comment: z.string().max(500).optional(),
})

export type Report = z.infer<typeof report>
