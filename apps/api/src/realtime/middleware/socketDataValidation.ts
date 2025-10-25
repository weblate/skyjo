import { CError, Constants as ErrorConstants } from "@skymo/error"
import type {
  AuthenticatedGameSocket,
  GameSocket,
  SocketData,
} from "@/realtime/types/gameSocket.js"

/**
 * Type guard to check if socket has valid game data
 * Prevents stale socket data from affecting games after player has left/forfeited/been kicked
 */
export function validateSocketData(
  socket: GameSocket,
): asserts socket is AuthenticatedGameSocket {
  if (!socket.data?.gameCode || !socket.data?.playerId) {
    throw new CError("Action not allowed: Player is not currently in a game", {
      code: ErrorConstants.ERROR.NOT_ALLOWED,
      level: "debug",
      meta: {
        socketId: socket.id,
        hasSocketData: !!socket.data,
        gameCode: socket.data?.gameCode,
        playerId: socket.data?.playerId,
      },
    })
  }
}

/**
 * Clears socket data when player leaves/forfeits/gets kicked
 * Uses type assertion to bypass TypeScript constraints
 */
export function clearSocketData(socket: GameSocket): void {
  ;(socket as GameSocket & { data: SocketData | null }).data = null
}
