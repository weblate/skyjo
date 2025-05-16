import {
  getCurrentUser,
  login,
  logout,
  signup,
} from "@/http/auth/auth.service.js"
import { googleRouter } from "@/http/auth/google.router.js"
import { type AuthContextVariables } from "@/http/middlewares/auth.middleware.js"
import { validateSessionToken } from "@/http/session/session.service.js"
import { zValidator } from "@hono/zod-validator"
import { AuthError, SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import { loginSchema, signupSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { getCookie } from "hono/cookie"

const authRouter = new Hono<AuthContextVariables>().basePath("/auth")
authRouter.route("", googleRouter)

authRouter.post("/signup", zValidator("json", signupSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await signup(c, data)

    return c.json({
      success: true,
      status: 201,
    })
  } catch (_e) {
    return c.json({
      success: false,
      status: 500,
    })
  }
})

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await login(c, data)

    return c.json({
      success: true,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthError.LOGIN_INVALID_CREDENTIALS
    ) {
      return c.json({
        success: false,
        error: AuthError.LOGIN_INVALID_CREDENTIALS,
      })
    }

    throw error
  }
})

authRouter.post("/verify", async (c) => {
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)

  if (!sessionToken) {
    return c.json(
      { error: "Unauthorized", reason: "Missing session token" },
      401,
    )
  }

  try {
    const { session, user } = await validateSessionToken(sessionToken)

    if (!session || !user) {
      return c.json(
        { error: "Unauthorized", reason: "Invalid session token" },
        401,
      )
    }

    return c.json({
      success: true,
    })
  } catch (error) {
    throw error
  }
})

authRouter.post("/logout", async (c) => {
  try {
    await logout(c)

    return c.json({
      success: true,
      message: "Logged out successfully.",
    })
  } catch (error) {
    if (error instanceof Error && error.message === AuthError.LOGOUT_FAILED) {
      return c.json({
        success: false,
        message: "An error occurred during logout.",
      })
    }

    throw error
  }
})

authRouter.get("/me", async (c) => {
  try {
    const user = await getCurrentUser(c)

    return c.json({ user })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthError.SESSION_NOT_FOUND
    ) {
      return c.json({ user: null }, 401)
    } else if (
      error instanceof Error &&
      error.message === AuthError.USER_NOT_FOUND
    ) {
      return c.json({ user: null }, 404)
    }

    throw error
  }
})

export { authRouter }
