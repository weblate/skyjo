import { validateSessionToken } from "@/http/session/session.service.js"
import type { SessionDb, UserDb } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import {
  AuthError,
  HttpError,
  SESSION_COOKIE_NAME,
} from "@skymo/shared/constants"
import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"

export interface AuthContextVariables {
  Variables: { user: UserDb; session: SessionDb }
}
export const authMiddleware = async (c: Context, next: Next) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    return c.json(
      { success: false, error: AuthError.SESSION_TOKEN_MISSING },
      401,
    )
  }

  try {
    const { user, session } = await validateSessionToken(sessionToken)

    if (!user || !session) {
      return c.json({ success: false, error: AuthError.SESSION_INVALID }, 401)
    }

    c.set("user", user)
    c.set("session", session)
    await next()
  } catch (error) {
    Logger.error("Error during session token validation:", { error })
    return c.json(
      { success: false, error: HttpError.INTERNAL_SERVER_ERROR },
      500,
    )
  }
}
