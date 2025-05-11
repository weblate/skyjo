import { db } from "@/db/index.js"
import {
  type Session,
  type User,
  sessionTable,
  userTable,
} from "@/db/schema.js"
import { sha256 } from "@oslojs/crypto/sha2"
import { encodeBase32, encodeHexLowerCase } from "@oslojs/encoding"
import { eq } from "drizzle-orm"
import type { Context } from "hono"
import { getCookie, setCookie } from "hono/cookie"

type SessionValidationResult =
  | { session: Session; user: User }
  | { session: null; user: null }
export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const sessionId = getSessionId(token)

  const result = await db
    .select()
    .from(sessionTable)
    .innerJoin(userTable, eq(sessionTable.userId, userTable.id))
    .where(eq(sessionTable.id, sessionId))
    .limit(1)

  const row = result?.[0]
  if (!row) return { session: null, user: null }

  const session = row.sessions
  const user = row.users

  if (Date.now() >= session.expiresAt.getTime()) {
    await invalidateSession(session.id)
    return { session: null, user: null }
  }
  if (Date.now() >= session.expiresAt.getTime() - 1000 * 60 * 60 * 24 * 15) {
    await createSession(token, user.id)
  }

  return { session, user }
}

export const getCurrentSession = async (
  c: Context,
): Promise<SessionValidationResult> => {
  const token = getCookie(c, "session") ?? null
  if (token === null) {
    return { session: null, user: null }
  }
  const result = await validateSessionToken(token)
  return result
}

export async function invalidateSession(sessionId: string): Promise<void> {
  await db.delete(sessionTable).where(eq(sessionTable.id, sessionId))
}

export async function invalidateUserSessions(userId: number): Promise<void> {
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId))
}

export function setSessionTokenCookie(
  c: Context,
  token: string,
  expiresAt: Date,
): void {
  setCookie(c, "session", token, {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
  })
}

export function deleteSessionTokenCookie(c: Context): void {
  setCookie(c, "session", "", {
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
  })
}

export function generateSessionToken(): string {
  const tokenBytes = new Uint8Array(20)
  crypto.getRandomValues(tokenBytes)
  const token = encodeBase32(tokenBytes).toLowerCase()
  return token
}

export function getSessionId(token: string): string {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
  return sessionId
}

export async function createSession(
  token: string,
  userId: number,
): Promise<Session> {
  const sessionId = getSessionId(token)

  const session: Session = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  }
  await db.insert(sessionTable).values(session)

  return session
}
