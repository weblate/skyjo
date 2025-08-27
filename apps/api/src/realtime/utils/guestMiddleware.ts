import { GUEST_ID_COOKIE_NAME } from "@skymo/shared/constants"
import { parse } from "hono/utils/cookie"
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

    const cookies = parse(cookieHeader)
    const guestId = cookies[GUEST_ID_COOKIE_NAME]
    if (!guestId) throw new Error("No guestId cookie")

    socket.guestId = guestId

    next()
  } catch {
    socket.guestId = undefined

    next()
  }
}
