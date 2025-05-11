import { AuthService } from "@/http/auth/auth.service.js"
import { createGoogleAuthorizationURL } from "@/http/auth/lib/google.js"
import { Logger } from "@skymo/logger"
import { AuthError } from "@skymo/shared/constants"
import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import type { CookieOptions } from "hono/utils/cookie"

const authService = new AuthService()

const googleRouter = new Hono()

googleRouter.get("/login/google", async (c) => {
  try {
    const { url, state, codeVerifier } = createGoogleAuthorizationURL()

    const cookieOptions: CookieOptions = {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 60 * 10, // 10 minutes
      sameSite: "Lax",
    }

    setCookie(c, "google_oauth_state", state, cookieOptions)
    setCookie(c, "google_oauth_code_verifier", codeVerifier, cookieOptions)

    return c.json({
      success: true,
      redirectUrl: url.toString(),
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

googleRouter.get("/login/google/callback", async (c) => {
  const code = c.req.query("code")
  const state = c.req.query("state")
  const storedState = getCookie(c, "google_oauth_state")
  const codeVerifier = getCookie(c, "google_oauth_code_verifier")
  if (!code || !state || !storedState || !codeVerifier) {
    return c.json({
      success: false,
      error: AuthError.OAUTH_RESTART_PROCESS,
      statusCode: 400,
    })
  }
  if (storedState !== state) {
    return c.json({
      success: false,
      error: AuthError.OAUTH_RESTART_PROCESS,
      statusCode: 400,
    })
  }

  deleteCookie(c, "google_oauth_state")
  deleteCookie(c, "google_oauth_code_verifier")

  try {
    await authService.loginGoogle(code, codeVerifier, c)

    return c.json({
      success: true,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === AuthError.OAUTH_ID_TOKEN_MISSING
    ) {
      return c.json({
        success: false,
        error: AuthError.OAUTH_ID_TOKEN_MISSING,
        statusCode: 400,
      })
    }

    if (
      error instanceof Error &&
      error.message === AuthError.OAUTH_PARSE_USER_INFO_FAILED
    ) {
      return c.json({
        success: false,
        error: AuthError.OAUTH_PARSE_USER_INFO_FAILED,
        statusCode: 500,
      })
    }

    throw error
  }
})

export { googleRouter }
