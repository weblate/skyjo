import { ENV } from "@env"
import {
  passwordResetTable,
  sessionTable,
  userTable,
} from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import { locales, SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import type {
  ForgotPassword,
  LoginUser,
  Onboarding,
  ResetPassword,
  Signup,
} from "@skymo/shared/validations"
import { decodeIdToken } from "arctic"
import { and, eq, ne, or } from "drizzle-orm"
import type { Context } from "hono"
import { deleteCookie, getCookie } from "hono/cookie"
import { HTTPException } from "hono/http-exception"
import { db } from "@/db/index.js"
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
import { createUser, createUsername } from "@/http/user/user.service.js"
import { mailerQueue } from "@/utils/mailer.js"
import { generateRandomToken, hashToken } from "@/utils/randomString.js"
import { hashPassword, verifyPassword } from "./lib/password.js"

export async function signup(c: Context, data: Signup) {
  const { email, locale, name, avatar, settings } = data

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
    name,
    avatar,
    settings,
  })

  const token = generateSessionToken()
  const session = await createSession(token, user.id)
  setSessionTokenCookie(c, token, session.expiresAt)
}

export async function login(c: Context, data: LoginUser) {
  const { login, password } = data

  const username = login.replace("@", "")

  const user = await db
    .select()
    .from(userTable)
    .where(or(eq(userTable.email, login), eq(userTable.username, username)))
    .limit(1)

  if (user.length === 0 || !user[0].password) {
    throw new HTTPException(401, {
      message: "login-invalid-credentials",
    })
  }

  const isValidPassword = await verifyPassword(user[0].password, password)
  if (!isValidPassword) {
    throw new HTTPException(401, {
      message: "login-invalid-credentials",
    })
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
    const username = await createUsername(name?.split(" ")[0] ?? "unnamed")
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
  const sessionToken = getCookie(c, SESSION_COOKIE_NAME)
  if (!sessionToken) return

  const sessionId = createSessionId(sessionToken)

  deleteCookie(c, SESSION_COOKIE_NAME)

  if (!sessionId) return

  try {
    await db.delete(sessionTable).where(eq(sessionTable.id, sessionId))
  } catch (error) {
    Logger.error("Logout error - failed to delete session from DB:", {
      error,
    })

    throw new HTTPException(500, {
      message: "logout-error",
    })
  }
}

export async function getCurrentUser(c: Context) {
  const sessionIdFromCookie = getCookie(c, SESSION_COOKIE_NAME)
  if (!sessionIdFromCookie)
    throw new HTTPException(401, {
      message: "session-not-found",
    })

  const session = await db
    .select()
    .from(sessionTable)
    .where(eq(sessionTable.id, createSessionId(sessionIdFromCookie)))
    .limit(1)

  if (session.length === 0) {
    deleteCookie(c, SESSION_COOKIE_NAME)
    throw new HTTPException(401, {
      message: "session-not-found",
    })
  }

  const user = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
      username: userTable.username,
      avatar: userTable.avatar,
      settings: userTable.settings,
      emailVerified: userTable.emailVerified,
      googleId: userTable.googleId,
      facebookId: userTable.facebookId,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
      role: userTable.role,
    })
    .from(userTable)
    .where(eq(userTable.id, session[0].userId))
    .limit(1)

  if (user.length === 0) {
    Logger.error(
      "User not found with getCurrentUser. This should not happen.",
      {
        sessionId: sessionIdFromCookie,
      },
    )
    deleteCookie(c, SESSION_COOKIE_NAME)
    throw new HTTPException(404, {
      message: "user-not-found",
    })
  }

  return user[0]
}

export async function completeOnboarding(userId: number, data: Onboarding) {
  const isAvailable = await checkUsernameAvailability(data.username, userId)

  if (!isAvailable)
    throw new HTTPException(400, {
      message: "username-taken",
    })

  const [updatedUser] = await db
    .update(userTable)
    .set({
      password: data.password ? await hashPassword(data.password) : undefined,
      name: data.name,
      username: data.username,
      avatar: data.avatar,
      updatedAt: new Date(),
      onboardingCompleted: true,
    })
    .where(eq(userTable.id, userId))
    .returning({
      id: userTable.id,
      email: userTable.email,
      username: userTable.username,
      avatar: userTable.avatar,
      name: userTable.name,
      settings: userTable.settings,
      onboardingCompleted: userTable.onboardingCompleted,
      role: userTable.role,
    })

  return updatedUser
}

export async function checkUsernameAvailability(
  username: string,
  currentUserId?: number,
): Promise<boolean> {
  const existingUser = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(
      and(
        eq(userTable.username, username),
        currentUserId ? ne(userTable.id, currentUserId) : undefined,
      ),
    )
    .limit(1)

  return existingUser.length === 0
}

export async function requestPasswordReset(data: ForgotPassword) {
  const { email } = data

  const user = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      settings: userTable.settings,
    })
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)

  if (user.length === 0) {
    // For security, we don't reveal if the email exists or not
    Logger.warn("Password reset requested for non-existent email", { email })
    return
  }

  const userRecord = user[0]

  const token = generateRandomToken()
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  // Remove any existing password reset tokens for this user
  await db
    .delete(passwordResetTable)
    .where(eq(passwordResetTable.userId, userRecord.id))

  // Store new token
  await db.insert(passwordResetTable).values({
    userId: userRecord.id,
    token: hashToken(token),
    expiresAt,
  })

  // Send email with reset link
  const resetUrl = `${ENV.WEBSITE_URL}/reset-password/${encodeURIComponent(token)}`

  await mailerQueue.add("reset-password", {
    to: email,
    template: "reset-password",
    locale: userRecord.settings?.locale ?? "en",
    content: {
      resetUrl,
    },
  })
  Logger.info("Password reset email queued", { email, userId: userRecord.id })
}

export async function resetPassword(data: ResetPassword) {
  const { token, password } = data

  const hashedToken = hashToken(token)

  // Find valid token
  const resetRecord = await db
    .select({
      id: passwordResetTable.id,
      userId: passwordResetTable.userId,
      expiresAt: passwordResetTable.expiresAt,
    })
    .from(passwordResetTable)
    .where(eq(passwordResetTable.token, hashedToken))
    .limit(1)

  if (resetRecord.length === 0) {
    throw new HTTPException(400, {
      message: "reset-token-invalid",
    })
  }

  const reset = resetRecord[0]

  // Check if token is expired
  if (reset.expiresAt < new Date()) {
    await db
      .delete(passwordResetTable)
      .where(eq(passwordResetTable.id, reset.id))
    throw new HTTPException(400, {
      message: "reset-token-expired",
    })
  }

  const hashedPassword = await hashPassword(password)

  await db
    .update(userTable)
    .set({ password: hashedPassword })
    .where(eq(userTable.id, reset.userId))

  await db.delete(passwordResetTable).where(eq(passwordResetTable.id, reset.id))

  await db.delete(sessionTable).where(eq(sessionTable.userId, reset.userId))
}
