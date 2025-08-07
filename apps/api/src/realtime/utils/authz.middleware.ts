import { CError } from "@skymo/error"
import type { GameSocket } from "@/realtime/types/gameSocket.js"

export const isAuthenticated = (socket: GameSocket) => {
  if (!socket.user) {
    throw new CError("UnauthorizedError", {
      code: "unauthorized",
    })
  }
}
