import { getOAuthCookies as getGoogleOAuthCookies } from "@/http/auth/lib/google.js"
import { zValidator } from "@hono/zod-validator"
import { Logger } from "@skymo/logger"
import { AuthErrorKeys } from "@skymo/shared/constants"
import { loginSchema, registerSchema } from "@skymo/shared/validations"
import { Hono } from "hono"
import { deleteCookie } from "hono/cookie"
import { AuthService } from "./auth.service.js"

const authService = new AuthService()

const authRouter = new Hono().basePath("/auth")

authRouter.post("/register", zValidator("json", registerSchema), async (c) => {
  const data = c.req.valid("json")
  try {
    await authService.register(data)

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
    await authService.login(data, c)

    return c.json({
      success: true,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthErrorKeys.LOGIN_INVALID_CREDENTIALS
    ) {
      return c.json({
        success: false,
        error: AuthErrorKeys.LOGIN_INVALID_CREDENTIALS,
      })
    }

    throw error
  }
})

authRouter.post("/logout", async (c) => {
  try {
    await authService.logout(c)

    return c.json({
      success: true,
      message: "Logged out successfully.",
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthErrorKeys.LOGOUT_FAILED
    ) {
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
    const user = await authService.getCurrentUser(c)

    return c.json({ user })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthErrorKeys.SESSION_NOT_FOUND
    ) {
      return c.json({ user: null }, 401)
    } else if (
      error instanceof Error &&
      error.message === AuthErrorKeys.USER_NOT_FOUND
    ) {
      return c.json({ user: null }, 404)
    }

    throw error
  }
})

//#region Google OAuth Routes
authRouter.get("/google/login", async (c) => {
  try {
    const redirectUrl = authService.googleLoginRedirect(c)

    return c.json({
      success: true,
      redirectUrl,
    })
  } catch (error) {
    Logger.error("Google login initiation route error:", { error })
    return c.json(
      {
        success: false,
        message: "Failed to initiate Google login.",
      },
      500,
    )
  }
})

authRouter.get("/google/callback", async (c) => {
  const code = c.req.query("code")
  const state = c.req.query("state")

  const { storedState, storedCodeVerifier } = getGoogleOAuthCookies(c)

  deleteCookie(c, "google_oauth_state", { path: "/" })
  deleteCookie(c, "google_oauth_code_verifier", { path: "/" })

  if (!code || !state || !storedState || !storedCodeVerifier) {
    return c.json({
      success: false,
      error: AuthErrorKeys.OAUTH_INVALID_CALLBACK_PARAMS,
      statusCode: 400,
    })
  }

  try {
    await authService.googleLoginCallback(c, code, state)

    return c.json({
      success: true,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthErrorKeys.OAUTH_ID_TOKEN_MISSING
    ) {
      return c.json({
        success: false,
        error: AuthErrorKeys.OAUTH_ID_TOKEN_MISSING,
        statusCode: 400,
      })
    }

    if (
      error instanceof Error &&
      error.message === AuthErrorKeys.OAUTH_PARSE_USER_INFO_FAILED
    ) {
      return c.json({
        success: false,
        error: AuthErrorKeys.OAUTH_PARSE_USER_INFO_FAILED,
        statusCode: 500,
      })
    }

    throw error
  }
})
//#endregion

export { authRouter }
