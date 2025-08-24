import { GUEST_ID_COOKIE_NAME } from "@skymo/shared/constants"
import type { GameSocket } from "@/realtime/types/gameSocket.js"

/**
 * Socket.IO middleware that attaches guestId to socket
 */
export const guestMiddleware = async (
  socket: GameSocket,
  next: (err?: Error) => void,
) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie
    if (!cookieHeader) throw new Error("No cookie header")

    const match = new RegExp(`${GUEST_ID_COOKIE_NAME}=([^;]+)`).exec(
      cookieHeader,
    )
    if (!match) throw new Error("No guestId cookie")

    const guestId = decodeURIComponent(match[1])
    if (!guestId) throw new Error("No guestId value")

    socket.guestId = guestId

    next()
  } catch {
    socket.guestId = undefined

    next()
  }
}
