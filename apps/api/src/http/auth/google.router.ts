import { loginGoogle } from "@/http/auth/auth.service.js"
import { createGoogleAuthorizationURL } from "@/http/auth/lib/google.js"
import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { Hono } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import type { CookieOptions } from "hono/utils/cookie"

export const googleRouter = new Hono()
  .get("/login/google", async (c) => {
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

      return c.json({ redirectUrl: url.toString() }, 200)
    } catch (error) {
      Logger.error("Google login initiation route error:", { error })
      return c.json({ error: "oauth-initiation-failed" }, 500)
    }
  })
  .get("/login/google/callback", async (c) => {
    const code = c.req.query("code")
    const state = c.req.query("state")
    const storedState = getCookie(c, "google_oauth_state")
    const codeVerifier = getCookie(c, "google_oauth_code_verifier")
    if (!code || !state || !storedState || !codeVerifier) {
      return c.json({ error: "oauth-restart-process" }, 400)
    }

    if (storedState !== state) {
      return c.json({ error: "oauth-restart-process" }, 400)
    }

    deleteCookie(c, "google_oauth_state")
    deleteCookie(c, "google_oauth_code_verifier")

    try {
      await loginGoogle(c, code, codeVerifier)

      return c.redirect(`${ENV.WEBSITE_URL}/auth/callback`)
    } catch (error) {
      if (error instanceof Error) {
        return c.json({ error: error.message }, 400)
      }

      Logger.error("Google login callback error:", { error })
      return c.json({ error: "oauth-unknown-error" }, 500)
    }
  })
