import { db } from "@/db/index.js"
import { hashPassword } from "@/http/auth/lib/password.js"
import type { Avatar } from "@skymo/core"
import {
  type UserDb,
  gameTable,
  playerTable,
  userTable,
} from "@skymo/database/schema"
import { type Locales, UserError } from "@skymo/shared/constants"
import type { GameHistoryQuery } from "@skymo/shared/validations"
import { desc, eq } from "drizzle-orm"

interface CreateUserParams {
  email: string
  name?: string
  username?: string
  googleId?: string
  locale?: Locales
  avatar?: Avatar
  emailVerified?: boolean
  password?: string
}
export async function createUser({
  googleId,
  email,
  name,
  username,
  locale,
  avatar,
  emailVerified,
  password,
}: CreateUserParams): Promise<UserDb> {
  const createdName = name ?? null
  const createdUsername = username ?? (name ? await createUsername(name) : null)

  const row = await db
    .insert(userTable)
    .values({
      email: email,
      name: createdName,
      username: createdUsername,
      password: password ? await hashPassword(password) : null,
      googleId: googleId ?? null,
      locale,
      avatar,
      emailVerified,
    })
    .returning({
      id: userTable.id,
      name: userTable.name,
      username: userTable.username,
      email: userTable.email,
      googleId: userTable.googleId,
      facebookId: userTable.facebookId,
      locale: userTable.locale,
      avatar: userTable.avatar,
      emailVerified: userTable.emailVerified,
      onboardingCompleted: userTable.onboardingCompleted,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
    })

  const user = row?.[0]
  if (!user) throw new Error(UserError.UNEXPECTED_ERROR)

  return user
}

export async function getUserFromGoogleId(
  googleId: string,
): Promise<UserDb | null> {
  const row = await db
    .select()
    .from(userTable)
    .where(eq(userTable.googleId, googleId))
    .limit(1)

  const user = row?.[0]
  if (!user) return null

  return user
}

export async function createUsername(name: string) {
  const parsedUsername = name.slice(0, 15)

  let username = ""
  // Generate a user tag until it's unique. Maximum of 20 retries before throwing an error
  for (let i = 0; i < 20; i++) {
    username = `${parsedUsername}_${Math.floor(1000 + Math.random() * 9000)}`

    const existingUser = await db
      .select()
      .from(userTable)
      .where(eq(userTable.username, username))
      .limit(1)

    if (existingUser.length === 0) break
    if (i === 19) throw new Error(UserError.CREATION_FAILED)
  }

  return username
}

export async function getUserByUsername(
  username: string,
): Promise<UserDb | null> {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username))
    .limit(1)

  if (!user) return null

  return user
}

export async function getUserGames(
  username: string,
  { limit = 20, offset = 0 }: GameHistoryQuery,
) {
  const games = await db
    .select({
      id: gameTable.id,
      code: gameTable.code,
      settings: gameTable.settings,
      createdAt: gameTable.createdAt,
      finishedAt: gameTable.finishedAt,
      rank: playerTable.rank,
    })
    .from(gameTable)
    .innerJoin(playerTable, eq(gameTable.id, playerTable.gameId))
    .innerJoin(userTable, eq(playerTable.userId, userTable.id))
    .where(eq(userTable.username, username))
    .limit(limit)
    .orderBy(desc(gameTable.finishedAt))
    .offset(offset)

  return games
}
