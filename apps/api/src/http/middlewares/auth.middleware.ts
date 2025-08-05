import type { SessionDb, UserDb, UserRole } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"
import { validateSessionToken } from "@/http/session/session.service.js"

export interface AuthContextVariables {
  Variables: { user: UserDb; session: SessionDb }
}

const hasRequiredRole = (
  userRole: UserRole,
  requiredRole: UserRole,
): boolean => {
  if (userRole === "ADMIN") return true

  if (userRole === "USER" && requiredRole === "USER") return true

  return false
}

export const authMiddleware = (requiredRole: UserRole = "USER") => {
  return async (c: Context, next: Next) => {
    const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

    if (!sessionToken) {
      return c.json({ error: "session-token-missing" }, 401)
    }

    try {
      const { user, session } = await validateSessionToken(sessionToken)

      if (!user || !session) {
        return c.json({ error: "session-invalid" }, 401)
      }

      if (!hasRequiredRole(user.role, requiredRole)) {
        return c.json({ error: "insufficient-permissions" }, 403)
      }

      c.set("user", user)
      c.set("session", session)
      await next()
    } catch (error) {
      Logger.error("Error during session token validation:", { error })
      return c.json({ error: "internal-server-error" }, 500)
    }
  }
}
