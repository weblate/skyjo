import { CError } from "@skymo/error"
import type { GameSocket } from "@/realtime/types/gameSocket.js"

export const isAuthenticated = (
  socket: GameSocket,
  next: (err?: Error) => void,
) => {
  if (!socket.user) {
    return next(
      new CError({
        name: "UnauthorizedError",
        message: "You must be logged in to perform this action",
        isPublic: true,
      }),
    )
  }
  next()
}
