import { z } from "zod"

export const getPublicGamesQuerySchema = z.object({
  nbPerPage: z.coerce.number().int().min(1).prefault(20),
  page: z.coerce.number().int().min(1).prefault(1),
})
export type GetPublicGamesQuery = z.infer<typeof getPublicGamesQuerySchema>
