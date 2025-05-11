import { db } from "@/db/index.js"
import {
  type SessionDb,
  type UserDb,
  sessionTable,
  userTable,
} from "@/db/schema.js"
import { sha256 } from "@oslojs/crypto/sha2"
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from "@oslojs/encoding"
import { and, eq } from "drizzle-orm"
import type { Context } from "hono"
import { getCookie } from "hono/cookie"

type SessionValidationResult =
  | { session: SessionDb; user: UserDb }
  | { session: null; user: null }
export async function validateSessionToken(
  token: string,
): Promise<SessionValidationResult> {
  const sessionId = createSessionId(token)

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
    await updateSession(session.id, user.id)
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

export function generateSessionToken(): string {
  const bytes = new Uint8Array(20)
  crypto.getRandomValues(bytes)
  const token = encodeBase32LowerCaseNoPadding(bytes)
  return token
}

export function createSessionId(token: string): string {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)))
  return sessionId
}

export async function createSession(
  token: string,
  userId: number,
): Promise<SessionDb> {
  const sessionId = createSessionId(token)
  const session: SessionDb = {
    id: sessionId,
    userId,
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
  }
  await db.insert(sessionTable).values(session)

  return session
}

export async function updateSession(
  sessionId: string,
  userId: number,
): Promise<void> {
  await db
    .update(sessionTable)
    .set({
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    })
    .where(and(eq(sessionTable.id, sessionId), eq(sessionTable.userId, userId)))
}
