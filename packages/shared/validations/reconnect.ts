import { z } from "zod"

export const reconnect = z.object({
  gameCode: z.string(),
  playerId: z.string().uuid(),
  sessionId: z.string().uuid(),
})

export type LastGame = z.infer<typeof reconnect>
