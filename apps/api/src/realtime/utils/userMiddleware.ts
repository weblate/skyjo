import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import { validateSessionToken } from "@/http/session/session.service.js"
import type { GameSocket } from "@/realtime/types/gameSocket.js"

/**
 * Socket.IO middleware that attaches user/session to socket.data if a valid session token is present.
 * Does not block guests (no session or invalid session). Always calls next().
 */
export const userMiddleware = async (
  socket: GameSocket,
  next: (err?: Error) => void,
) => {
  try {
    const cookieHeader = socket.handshake.headers.cookie
    if (!cookieHeader) throw new Error("No cookie header")

    const match = new RegExp(`${SESSION_COOKIE_NAME}=([^;]+)`).exec(
      cookieHeader,
    )
    if (!match) throw new Error("No session token")

    const sessionToken = decodeURIComponent(match[1])
    if (!sessionToken) throw new Error("No session token")

    const { user, session } = await validateSessionToken(sessionToken)
    if (!user || !session) throw new Error("Invalid session token")

    socket.user = user
    socket.session = session

    next()
  } catch {
    socket.user = undefined
    socket.session = undefined

    next()
  }
}
