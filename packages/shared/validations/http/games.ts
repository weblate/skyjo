import { z } from "zod"

export const getLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(10),
})
export type GetLeaderboardQuery = z.infer<typeof getLeaderboardQuerySchema>

export const getGameStatusParamsSchema = z.object({
  code: z.string().min(1),
})
export type GetGameStatusParams = z.infer<typeof getGameStatusParamsSchema>
