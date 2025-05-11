import { db } from "@/db/index.js"
import { sessionTable, userTable } from "@/db/schema.js"
import {
  type GoogleUser,
  validateGoogleAuthorizationCode,
} from "@/http/auth/lib/google.js"
import { createUser } from "@/http/user/user.service.js"
import { mailerQueue } from "@/utils/mailer.js"
import { Logger } from "@skymo/logger"
import { AuthError } from "@skymo/shared/constants"
import type { LoginUser, RegisterUser } from "@skymo/shared/validations"
import { decodeIdToken } from "arctic"
import { eq, or } from "drizzle-orm"
import type { Context } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { nanoid } from "nanoid"
import { verifyPassword } from "./lib/password.js"

const SESSION_COOKIE_NAME = "skymo_session_id"

export async function register(data: RegisterUser) {
  const { email, username, password, locale } = data

  const existingUser = await db
    .select({ id: userTable.id, email: userTable.email })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)

  // TODO: Add job to email queue: send email to existingUser[0].email
  //  - Subject: Account already exists or Password reset instructions
  //  - Content: Explain that an account with this email already exists.
  //             Provide options like "Log in" or "Forgot your password?"
  //             (The latter would typically involve a password reset token flow).
  if (existingUser.length > 0) return

  await createUser({
    email,
    username,
    password,
    locale,
  })

  // TODO: Add job to email queue: send welcome email to newUserResult[0].email + verify email + continue your inscription with the link
  mailerQueue.add("signup", {
    to: email,
    template: "signup",
    locale: locale ?? "en",
    content: {
      username,
      email,
      token: "123456",
    },
  })
}

export async function login(data: LoginUser, c: Context) {
  const { login, password } = data

  const user = await db
    .select()
    .from(userTable)
    .where(or(eq(userTable.email, login), eq(userTable.userTag, login)))
    .limit(1)

  if (user.length === 0 || !user[0].password) {
    throw new Error(AuthError.LOGIN_INVALID_CREDENTIALS)
  }

  const isValidPassword = await verifyPassword(user[0].password, password)
  if (!isValidPassword) {
    throw new Error(AuthError.LOGIN_INVALID_CREDENTIALS)
  }

  await createSession(user[0].id, c)
}

export async function loginGoogle(
  code: string,
  codeVerifier: string,
  c: Context,
) {
  const tokens = await validateGoogleAuthorizationCode(code, codeVerifier)

  const claims = decodeIdToken(tokens.idToken()) as GoogleUser

  const googleId = claims.sub
  const name = claims.name
  const email = claims.email
  const locale = claims?.locale
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

  await createSession(userId, c)
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
  const sessionId = getCookie(c, SESSION_COOKIE_NAME)
  if (!sessionId) throw new Error(AuthError.SESSION_NOT_FOUND)

  const session = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.id, sessionId))
    .limit(1)

  if (session.length === 0) {
    deleteCookie(c, SESSION_COOKIE_NAME)
    throw new Error(AuthError.SESSION_NOT_FOUND)
  }

  const user = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      username: userTable.username,
      userTag: userTable.userTag,
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

export async function createSession(userId: number, c: Context) {
  const sessionId = nanoid()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  await db.insert(sessionTable).values({ id: sessionId, userId, expiresAt })

  setCookie(c, SESSION_COOKIE_NAME, sessionId, {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    expires: expiresAt,
  })

  return { sessionId }
}
