import {
  getCurrentUser,
  login,
  logout,
  register,
} from "@/http/auth/auth.service.js"
import { googleRouter } from "@/http/auth/google.router.js"
import { zValidator } from "@hono/zod-validator"
import { AuthError } from "@skymo/shared/constants"
import { loginSchema, registerSchema } from "@skymo/shared/validations"
import { Hono } from "hono"

const authRouter = new Hono().basePath("/auth")
authRouter.route("", googleRouter)

authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await register(data)

    return c.json({
      success: true,
      status: 201,
    })
  } catch {
    return c.json({
      success: false,
      status: 500,
    })
  }
})

authRouter.post("/login", zValidator("json", loginSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await login(data, c)

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
