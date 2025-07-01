import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import type { Context } from "hono"
import { setCookie } from "hono/cookie"

export function setSessionTokenCookie(
  c: Context,
  token: string,
  expiresAt: Date,
) {
  setCookie(c, SESSION_COOKIE_NAME, token, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    expires: expiresAt,
  })
}
