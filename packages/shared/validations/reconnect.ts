import { z } from "zod"

export const reconnect = z.object({
  gameCode: z.string(),
  playerId: z.uuid(),
  sessionId: z.uuid(),
})

export type LastGame = z.infer<typeof reconnect>
