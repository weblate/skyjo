import { validateSessionToken } from "@/http/session/session.service.js"
import type { SessionDb, UserDb } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"

export interface AuthContextVariables {
  Variables: { user: UserDb; session: SessionDb }
}
export const authMiddleware = async (c: Context, next: Next) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    return c.json({ error: "session-token-missing" }, 401)
  }

  try {
    const { user, session } = await validateSessionToken(sessionToken)

    if (!user || !session) {
      return c.json({ error: "session-invalid" }, 401)
    }

    c.set("user", user)
    c.set("session", session)
    await next()
  } catch (error) {
    Logger.error("Error during session token validation:", { error })
    return c.json({ error: "internal-server-error" }, 500)
  }
}
