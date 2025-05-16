import { db } from "@/db/index.js"
import { sessionTable, userTable } from "@/db/schema.js"
import { setSessionTokenCookie } from "@/http/auth/lib/cookie.js"
import {
  type GoogleUser,
  validateGoogleAuthorizationCode,
} from "@/http/auth/lib/google.js"
import {
  createSession,
  createSessionId,
  generateSessionToken,
} from "@/http/session/session.service.js"
import { createUser } from "@/http/user/user.service.js"
import { Logger } from "@skymo/logger"
import {
  AuthError,
  SESSION_COOKIE_NAME,
  locales,
} from "@skymo/shared/constants"
import type { LoginUser, Signup } from "@skymo/shared/validations"
import { decodeIdToken } from "arctic"
import { eq, or } from "drizzle-orm"
import type { Context } from "hono"
import { deleteCookie, getCookie } from "hono/cookie"
import { verifyPassword } from "./lib/password.js"

export async function signup(c: Context, data: Signup) {
  const { email, locale } = data

  const existingUser = await db
    .select({ id: userTable.id, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)

  if (existingUser.length > 0) {
    // TODO: Add job to email queue: send email to existingUser[0].email
    //  - Subject: Registration attempt on this email
    //  - Content: Explain that an account with this email already exists.
    //             Provide options like "Log in" or "Forgot your password?"
    return
  }

  const user = await createUser({
    email,
    locale,
  })

  const token = generateSessionToken()
  const session = await createSession(token, user.id)
  setSessionTokenCookie(c, token, session.expiresAt)
}

export async function login(c: Context, data: LoginUser) {
  const { login, password } = data

  const user = await db
    .select()
    .from(userTable)
    .where(or(eq(userTable.email, login), eq(userTable.username, login)))
    .limit(1)

  if (user.length === 0 || !user[0].password) {
    throw new Error(AuthError.LOGIN_INVALID_CREDENTIALS)
  }

  const isValidPassword = await verifyPassword(user[0].password, password)
  if (!isValidPassword) {
    throw new Error(AuthError.LOGIN_INVALID_CREDENTIALS)
  }

  const token = generateSessionToken()
  const session = await createSession(token, user[0].id)
  setSessionTokenCookie(c, token, session.expiresAt)
}

export async function loginGoogle(
  c: Context,
  code: string,
  codeVerifier: string,
) {
  const tokens = await validateGoogleAuthorizationCode(code, codeVerifier)

  const claims = decodeIdToken(tokens.idToken()) as GoogleUser

  const googleId = claims.sub
  const name = claims.name
  const email = claims.email
  const locale = locales.find((l) => l === claims?.locale) ?? "en"
  const emailVerified = claims?.email_verified

  const userRecord = await db
    .select()
    .from(userTable)
    .where(or(eq(userTable.googleId, googleId), eq(userTable.email, email)))
    .limit(1)
  const user = userRecord?.[0]
  let userId = user?.id

  // If the user exists and has no googleId, set the googleId
  if (user && user.googleId === null) {
    await db
      .update(userTable)
      .set({ googleId })
      .where(eq(userTable.id, user.id))
  } else if (!user) {
    const username = name?.split(" ")[0] ?? "unnamed"
    const newUser = await createUser({
      email,
      username,
      googleId: googleId ?? null,
      locale,
      emailVerified,
    })

    userId = newUser.id
  }

  const token = generateSessionToken()
  const session = await createSession(token, userId)
  setSessionTokenCookie(c, token, session.expiresAt)
}

export async function logout(c: Context) {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME)

  deleteCookie(c, SESSION_COOKIE_NAME)

  if (!sessionId) return

  try {
    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId))
  } catch (error) {
    Logger.error("Logout error - failed to delete session from DB:", {
      error,
    })

    throw new Error(AuthError.LOGOUT_FAILED)
  }
}

export async function getCurrentUser(c: Context) {
  const sessionIdFromCookie = getCookie(c, SESSION_COOKIE_NAME)
  if (!sessionIdFromCookie) throw new Error(AuthError.SESSION_NOT_FOUND)

  const session = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.id, createSessionId(sessionIdFromCookie)))
    .limit(1)

  if (session.length === 0) {
    deleteCookie(c, SESSION_COOKIE_NAME)
    throw new Error(AuthError.SESSION_NOT_FOUND)
  }

  const user = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
      username: userTable.username,
      avatar: userTable.avatar,
      locale: userTable.locale,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })
    .from(userTable)
    .where(eq(userTable.id, session[0].userId))
    .limit(1)

  if (user.length === 0) throw new Error(AuthError.USER_NOT_FOUND)

  return user[0]
}
