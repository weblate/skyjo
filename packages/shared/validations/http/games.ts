import { z } from "zod"

export const getLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})
export type GetLeaderboardQuery = z.infer<typeof getLeaderboardQuerySchema>
