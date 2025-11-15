import { z } from "zod"

export const gameHistoryQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).prefault(20),
  offset: z.coerce.number().int().min(0).prefault(0),
})

export type GameHistoryQuery = z.infer<typeof gameHistoryQuerySchema>
