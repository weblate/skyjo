import { z } from "zod"

export const getLeaderboardQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).prefault(10),
})
export type GetLeaderboardQuery = z.infer<typeof getLeaderboardQuerySchema>

export const getGameStatusParamsSchema = z.object({
  code: z.string().min(1),
})
export type GetGameStatusParams = z.infer<typeof getGameStatusParamsSchema>

export const getGameStatusQuerySchema = z.object({
  playerId: z.uuid().optional(),
})
export type GetGameStatusQuery = z.infer<typeof getGameStatusQuerySchema>

export const kickPlayerBodySchema = z.object({
  playerId: z.uuid(),
})
export type KickPlayerBody = z.infer<typeof kickPlayerBodySchema>
