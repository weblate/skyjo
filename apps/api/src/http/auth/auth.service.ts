import { db } from "@/db/index.js"
import { sessionTable, userTable } from "@/db/schema.js"
import { mailerQueue } from "@/utils/mailer.js"
import { Logger } from "@skymo/logger"
import { AuthErrorKeys } from "@skymo/shared/constants"
import type { LoginUser, RegisterUser } from "@skymo/shared/validations"
import { eq, or } from "drizzle-orm"
import type { Context } from "hono"
import { deleteCookie, getCookie, setCookie } from "hono/cookie"
import { nanoid } from "nanoid"
import {
  createGoogleAuthorizationURL,
  getGoogleUserFromIdToken,
  setOAuthCookies as setGoogleOAuthCookies,
  validateGoogleAuthorizationCode,
} from "./lib/google.js"
import { hashPassword, verifyPassword } from "./lib/password.js"

export class AuthService {
  private readonly SESSION_COOKIE_NAME = "skymo_session_id"

  async register(data: RegisterUser) {
    const { email, username, password } = data

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

    const hashedPassword = await hashPassword(password)

    const userTag = await this.createUserTag(username)
    const newUserResult = await db
      .insert(userTable)
      .values({
        email,
        username,
        userTag,
        password: hashedPassword,
      })
      .returning({ id: userTable.id })

    if (!newUserResult || newUserResult.length === 0) {
      throw new Error(AuthErrorKeys.USER_CREATION_FAILED)
    }

    // TODO: Add job to email queue: send welcome email to newUserResult[0].email + verify email + continue your inscription with the link
    mailerQueue.add("signup", {
      to: email,
      template: "signup",
      locale: "en",
      content: {
        username,
        email,
        token: "123456",
      },
    })
  }

  async login(data: LoginUser, c: Context) {
    const { login, password } = data

    const user = await db
      .select()
      .from(userTable)
      .where(or(eq(userTable.email, login), eq(userTable.userTag, login)))
      .limit(1)

    if (user.length === 0 || !user[0].password) {
      throw new Error(AuthErrorKeys.LOGIN_INVALID_CREDENTIALS)
    }

    const isValidPassword = await verifyPassword(user[0].password, password)
    if (!isValidPassword) {
      throw new Error(AuthErrorKeys.LOGIN_INVALID_CREDENTIALS)
    }

    await this.createSession(user[0].id, c)
  }

  async logout(c: Context) {
    const sessionId = getCookie(c, this.SESSION_COOKIE_NAME)

    deleteCookie(c, this.SESSION_COOKIE_NAME)

    if (!sessionId) return

    try {
      await db.delete(sessionTable).where(eq(sessionTable.id, sessionId))
    } catch (error) {
      Logger.error("Logout error - failed to delete session from DB:", {
        error,
      })

      throw new Error(AuthErrorKeys.LOGOUT_FAILED)
    }
  }

  async getCurrentUser(c: Context) {
    const sessionId = getCookie(c, this.SESSION_COOKIE_NAME)
    if (!sessionId) throw new Error(AuthErrorKeys.SESSION_NOT_FOUND)

    const session = await db
      .select()
      .from(sessionTable)
      .where(eq(sessionTable.id, sessionId))
      .limit(1)

    if (session.length === 0) {
      deleteCookie(c, this.SESSION_COOKIE_NAME)
      throw new Error(AuthErrorKeys.SESSION_NOT_FOUND)
    }

    const user = await db
      .select({
        id: userTable.id,
        email: userTable.email,
        username: userTable.username,
        userTag: userTable.userTag,
        avatar: userTable.avatar,
        createdAt: userTable.createdAt,
        updatedAt: userTable.updatedAt,
      })
      .from(userTable)
      .where(eq(userTable.id, session[0].userId))
      .limit(1)

    if (user.length === 0) throw new Error(AuthErrorKeys.USER_NOT_FOUND)

    return user[0]
  }

  googleLoginRedirect(c: Context) {
    const { url, state, codeVerifier } = createGoogleAuthorizationURL()
    setGoogleOAuthCookies(c, state, codeVerifier)

    return url.toString()
  }

  async googleLoginCallback(
    c: Context,
    code: string,
    storedCodeVerifier: string,
  ) {
    const tokens = await validateGoogleAuthorizationCode(
      code,
      storedCodeVerifier,
    )

    const idToken = tokens.idToken()
    if (!idToken) {
      throw new Error(AuthErrorKeys.OAUTH_ID_TOKEN_MISSING)
    }

    const googleUser = getGoogleUserFromIdToken(idToken)
    if (!googleUser || !googleUser.sub) {
      throw new Error(AuthErrorKeys.OAUTH_PARSE_USER_INFO_FAILED)
    }

    const userRecord = await db
      .select()
      .from(userTable)
      .where(
        or(
          eq(userTable.googleId, googleUser.sub),
          eq(userTable.email, googleUser.email || ""),
        ),
      )
      .limit(1)
    const user = userRecord?.[0]

    // If the user exists and has no googleId, set the googleId
    if (user && user.googleId === null) {
      await db
        .update(userTable)
        .set({ googleId: googleUser.sub })
        .where(eq(userTable.id, user.id))
    } else if (!user) {
      const username = googleUser.name?.split(" ")[0] ?? "unnamed"
      const userTag = await this.createUserTag(username)

      const newUserResult = await db
        .insert(userTable)
        .values({
          email: googleUser.email,
          username,
          userTag,
          googleId: googleUser.sub,
        })
        .returning({ id: userTable.id })

      if (!newUserResult || newUserResult.length === 0) {
        throw new Error(AuthErrorKeys.OAUTH_ACCOUNT_CREATION_FAILED)
      }
    }

    await this.createSession(user.id, c)
  }

  private async createSession(userId: number, c: Context) {
    const sessionId = nanoid()
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await db.insert(sessionTable).values({ id: sessionId, userId, expiresAt })

    setCookie(c, this.SESSION_COOKIE_NAME, sessionId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Strict",
      expires: expiresAt,
    })

    return { sessionId }
  }

  private async createUserTag(username: string) {
    const parsedUsername = username.slice(0, 15)

    let userTag = ""
    // Generate a user tag until it's unique. Maximum of 20 retries before throwing an error
    for (let i = 0; i < 20; i++) {
      userTag = `${parsedUsername}_${Math.floor(1000 + Math.random() * 9000)}`

      const existingUser = await db
        .select()
        .from(userTable)
        .where(eq(userTable.userTag, userTag))
        .limit(1)

      if (existingUser.length === 0) break
      if (i === 19) throw new Error(AuthErrorKeys.USER_CREATION_FAILED)
    }

    return userTag
  }
}
