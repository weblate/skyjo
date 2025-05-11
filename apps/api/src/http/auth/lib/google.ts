import { ENV } from "@env"
import * as arctic from "arctic"

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
  locale?: string
  email_verified?: boolean
}
