import { CError, Constants as ErrorConstants } from "@skymo/error"
import { RateLimiterMemory } from "rate-limiter-flexible"
import type { GameSocket } from "@/realtime/types/gameSocket.js"

const consumeSocketRateLimiter = (rateLimiter: RateLimiterMemory) => {
  return async (socket: GameSocket) => {
    try {
      await rateLimiter.consume(socket.id)
    } catch {
      socket.emit("error:rate-limit")

      throw new CError("Too Many Requests", {
        code: ErrorConstants.ERROR.TOO_MANY_REQUESTS,
        level: "info",
        meta: {
          socketId: socket.id,
          gameCode: socket.data?.gameCode,
          playerId: socket.data?.playerId,
        },
      })
    }
  }
}

export { consumeSocketRateLimiter }
