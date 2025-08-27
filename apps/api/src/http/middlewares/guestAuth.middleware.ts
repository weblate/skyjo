import type { SessionDb, UserDb } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import {
  GUEST_ID_COOKIE_NAME,
  SESSION_COOKIE_NAME,
} from "@skymo/shared/constants"
import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"
import { validateSessionToken } from "@/http/session/session.service.js"

export interface GuestAuthContextVariables {
  Variables: {
    user?: UserDb
    session?: SessionDb
    guestId?: string
  }
}

/**
 * Middleware that allows both authenticated and guest users.
 * Always sets a guestId, and optionally sets user/session if authenticated.
 */
export const guestAuthMiddleware = () => {
  return async (c: Context, next: Next) => {
    const guestId = getCookie(c, GUEST_ID_COOKIE_NAME)
    c.set("guestId", guestId)

    // Try to get authenticated user if session exists
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

    if (sessionToken) {
      try {
        const { user, session } = await validateSessionToken(sessionToken)

        if (user && session) {
          c.set("user", user)
          c.set("session", session)
        }
      } catch (error) {
        // Session invalid, continue as guest
        Logger.debug("Session validation failed, continuing as guest", {
          error,
        })
      }
    }

    await next()
  }
}
