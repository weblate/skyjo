import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import * as arctic from "arctic"
import type { Context } from "hono"
import { getCookie, setCookie } from "hono/cookie"
import type { CookieOptions } from "hono/utils/cookie"

const google = new arctic.Google(
  ENV.GOOGLE_CLIENT_ID,
  ENV.GOOGLE_CLIENT_SECRET,
  ENV.GOOGLE_REDIRECT_URI,
)

const DEFAULT_SCOPES = ["openid", "email", "profile"]

interface CreateGoogleAuthUrlResult {
  url: URL
  state: string
  codeVerifier: string
}
export const createGoogleAuthorizationURL = (
  scopes: string[] = DEFAULT_SCOPES,
): CreateGoogleAuthUrlResult => {
  const state = arctic.generateState()
  const codeVerifier = arctic.generateCodeVerifier()
  const url = google.createAuthorizationURL(state, codeVerifier, scopes)

  return { url, state, codeVerifier }
}

export const validateGoogleAuthorizationCode = async (
  code: string,
  storedCodeVerifier: string,
): Promise<arctic.OAuth2Tokens> => {
  const tokens = await google.validateAuthorizationCode(
    code,
    storedCodeVerifier,
  )

  return tokens
}

export interface GoogleUser {
  sub: string
  email: string
  name: string
}
export const getGoogleUserFromIdToken = (
  idToken: string,
): GoogleUser | null => {
  try {
    const claims = arctic.decodeIdToken(idToken) as GoogleUser

    return claims
  } catch (err) {
    Logger.error("Error getting Google user from ID token:", { err })
    return null
  }
}

export const setOAuthCookies = (
  c: Context,
  state: string,
  codeVerifier: string,
) => {
  const cookieOptions: CookieOptions = {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    maxAge: 60 * 10, // 10 minutes
    sameSite: "Lax",
  }

  setCookie(c, "google_oauth_state", state, cookieOptions)
  setCookie(c, "google_oauth_code_verifier", codeVerifier, cookieOptions)
}

export const getOAuthCookies = (
  c: Context,
): {
  storedState?: string
  storedCodeVerifier?: string
} => {
  const storedState = getCookie(c, "google_oauth_state")
  const storedCodeVerifier = getCookie(c, "google_oauth_code_verifier")
  return { storedState, storedCodeVerifier }
}
