import { SESSION_COOKIE_NAME } from "@/constants.js"
import type { User } from "@/db/schema.js"
import { validateSessionToken } from "@/http/session/session.service.js"
import type { Context, Next } from "hono"
import { getCookie } from "hono/cookie"
import type { Session } from "inspector/promises"

export interface AuthContextVariables {
  Variables: { user: User; session: Session }
}
export const authMiddleware = async (c: Context, next: Next) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    return c.json(
      { error: "Unauthorized", reason: "Missing session token" },
      401,
    )
  }

  try {
    const { user, session } = await validateSessionToken(sessionToken)

    if (!user || !session) {
      return c.json(
        { error: "Unauthorized", reason: "Invalid or expired session" },
        401,
      )
    }

    c.set("user", user)
    c.set("session", session)
    await next()
  } catch (error) {
    // Log unexpected errors during token validation
    console.error("Error during session token validation:", error)
    return c.json({ error: "Internal Server Error" }, 500)
  }
}
