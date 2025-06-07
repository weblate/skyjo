import { db } from "@/db/index.js"
import { requestPasswordReset } from "@/http/auth/auth.service.js"
import { hashPassword, verifyPassword } from "@/http/auth/lib/password.js"
import { invalidateUserSessions } from "@/http/session/session.service.js"
import { mailerQueue } from "@/utils/mailer.js"
import { generateRandomToken, hashToken } from "@/utils/randomString.js"
import type { Avatar } from "@skymo/core"
import {
  type UserDb,
  emailChangeTable,
  gameTable,
  passwordResetTable,
  playerTable,
  userTable,
} from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import { type Locales, UserError } from "@skymo/shared/constants"
import type {
  GameHistoryQuery,
  UpdateAvatar,
  UpdateEmail,
  UpdateName,
  UpdatePassword,
  UpdateUsername,
} from "@skymo/shared/validations"
import dayjs from "dayjs"
import { and, avg, count, eq, ne, sql, sum } from "drizzle-orm"

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
      deletedAt: userTable.deletedAt,
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
  const gamePlayerResults = await db.execute(sql`
    WITH user_game_ids AS (
      SELECT DISTINCT g.id, g.finished_at
      FROM ${gameTable} g
      INNER JOIN ${playerTable} p ON g.id = p.game_id
      INNER JOIN ${userTable} u ON p.user_id = u.id
      WHERE u.username = ${username}
      ORDER BY g.finished_at DESC
      LIMIT ${limit} OFFSET ${offset}
    )
    SELECT 
      g.id as game_id,
      g.code as game_code,
      g.settings as game_settings,
      g.created_at as game_created_at,
      g.finished_at as game_finished_at,
      p.name as player_name,
      u.username as player_username,
      p.avatar as player_avatar,
      p.rank as player_rank,
      host_player.name as host_name
    FROM user_game_ids ugi
    INNER JOIN ${gameTable} g ON ugi.id = g.id
    INNER JOIN ${playerTable} p ON g.id = p.game_id
    LEFT JOIN ${userTable} u ON p.user_id = u.id
    LEFT JOIN ${playerTable} host_player ON g.host_id = host_player.id
    ORDER BY g.finished_at DESC, p.rank ASC
  `)

  // Group players by game efficiently
  const gamesMap = new Map()

  for (const row of gamePlayerResults.rows) {
    const gameId = row.game_id

    if (!gamesMap.has(gameId)) {
      gamesMap.set(gameId, {
        id: gameId,
        code: row.game_code,
        settings: row.game_settings,
        createdAt: row.game_created_at,
        finishedAt: row.game_finished_at,
        hostName: row.host_name,
        players: [],
      })
    }

    const game = gamesMap.get(gameId)

    if (row.player_username === username) {
      game.rank = row.player_rank
    }

    game.players.push({
      name: row.player_name,
      username: row.player_username,
      avatar: row.player_avatar,
      rank: row.player_rank,
    })
  }

  return Array.from(gamesMap.values())
}

export async function getUserStats(username: string) {
  const [result] = await db
    .select({
      totalGames: count(playerTable.id),
      wins: sum(sql`CASE WHEN ${playerTable.winner} = true THEN 1 ELSE 0 END`),
      averageRank: avg(playerTable.rank),
    })
    .from(playerTable)
    .innerJoin(gameTable, eq(playerTable.gameId, gameTable.id))
    .innerJoin(userTable, eq(playerTable.userId, userTable.id))
    .where(eq(userTable.username, username))

  if (!result || result.totalGames === 0) {
    return null
  }

  const totalGames = Number(result.totalGames)
  const wins = Number(result.wins || 0)
  const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0
  const averageRank = Number(result.averageRank || 0)

  return {
    totalGames,
    wins,
    winRate,
    averageRank,
  }
}

// User settings update functions
export async function updateUserName(userId: number, data: UpdateName) {
  const [updatedUser] = await db
    .update(userTable)
    .set({
      name: data.name,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId))
    .returning({
      id: userTable.id,
      email: userTable.email,
      username: userTable.username,
      avatar: userTable.avatar,
      name: userTable.name,
      locale: userTable.locale,
      onboardingCompleted: userTable.onboardingCompleted,
    })

  if (!updatedUser) throw new Error(UserError.UNEXPECTED_ERROR)
  return updatedUser
}

export async function updateUserUsername(userId: number, data: UpdateUsername) {
  const existingUser = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.username, data.username), ne(userTable.id, userId)))
    .limit(1)

  if (existingUser.length > 0) {
    throw new Error(UserError.USERNAME_TAKEN)
  }

  const [updatedUser] = await db
    .update(userTable)
    .set({
      username: data.username,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId))
    .returning({
      id: userTable.id,
      email: userTable.email,
      username: userTable.username,
      avatar: userTable.avatar,
      name: userTable.name,
      locale: userTable.locale,
      onboardingCompleted: userTable.onboardingCompleted,
    })

  if (!updatedUser) throw new Error(UserError.UNEXPECTED_ERROR)
  return updatedUser
}

export async function updateUserEmail(user: UserDb, data: UpdateEmail) {
  const oldEmail = user.email
  const newEmail = data.email

  const reversionToken = generateRandomToken()
  const hashedReversionToken = hashToken(reversionToken)
  const expiresAt = dayjs().add(7, "days").toDate()

  await db.transaction(async (tx) => {
    await tx
      .update(userTable)
      .set({
        email: newEmail,
        emailVerified: false,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, user.id))

    await tx.insert(emailChangeTable).values({
      userId: user.id,
      oldEmail,
      newEmail,
      token: hashedReversionToken,
      expiresAt,
    })
  })

  // Send warning email to old address
  const reversionUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/revert-email/${encodeURIComponent(reversionToken)}`

  await mailerQueue.add("email-change-warning", {
    to: oldEmail,
    template: "email-change-warning",
    locale: user.locale,
    content: {
      newEmail,
      reversionUrl,
    },
  })
  Logger.info("Email change warning sent", {
    userId: user.id,
    oldEmail,
    newEmail,
  })

  return {
    id: user.id,
    email: newEmail,
    username: user.username,
    avatar: user.avatar,
    name: user.name,
    locale: user.locale,
    onboardingCompleted: user.onboardingCompleted,
  }
}

export async function revertEmail(token: string) {
  const hashedToken = hashToken(token)

  const [emailChange] = await db
    .select({
      id: emailChangeTable.id,
      userId: emailChangeTable.userId,
      oldEmail: emailChangeTable.oldEmail,
      newEmail: emailChangeTable.newEmail,
      expiresAt: emailChangeTable.expiresAt,
    })
    .from(emailChangeTable)
    .where(eq(emailChangeTable.token, hashedToken))
    .limit(1)

  if (!emailChange) {
    throw new Error("Invalid reversion token")
  }

  if (emailChange.expiresAt < new Date()) {
    await db
      .delete(emailChangeTable)
      .where(eq(emailChangeTable.id, emailChange.id))
    throw new Error("Reversion token has expired")
  }

  const [userData] = await db
    .select({
      locale: userTable.locale,
    })
    .from(userTable)
    .where(eq(userTable.id, emailChange.userId))
    .limit(1)

  if (!userData) {
    throw new Error(UserError.NOT_FOUND)
  }

  await db.transaction(async (tx) => {
    await tx
      .update(userTable)
      .set({
        email: emailChange.oldEmail,
        emailVerified: true,
        updatedAt: new Date(),
      })
      .where(eq(userTable.id, emailChange.userId))

    await tx
      .delete(emailChangeTable)
      .where(eq(emailChangeTable.id, emailChange.id))

    await tx
      .delete(passwordResetTable)
      .where(eq(passwordResetTable.userId, emailChange.userId))
  })

  await invalidateUserSessions(emailChange.userId)

  await requestPasswordReset({ email: emailChange.oldEmail })
  return {
    success: true,
    message:
      "Email change has been reverted and your account has been secured. Please check your email for password reset instructions.",
  }
}

export async function updateUserPassword(userId: number, data: UpdatePassword) {
  const [user] = await db
    .select({ password: userTable.password })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!user || !user.password) {
    throw new Error(UserError.INVALID_CURRENT_PASSWORD)
  }

  const isValidPassword = await verifyPassword(
    user.password,
    data.currentPassword,
  )
  if (!isValidPassword) {
    throw new Error(UserError.INVALID_CURRENT_PASSWORD)
  }

  const hashedPassword = await hashPassword(data.newPassword)

  const [updatedUser] = await db
    .update(userTable)
    .set({
      password: hashedPassword,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId))
    .returning({
      id: userTable.id,
      email: userTable.email,
      username: userTable.username,
      avatar: userTable.avatar,
      name: userTable.name,
      locale: userTable.locale,
      onboardingCompleted: userTable.onboardingCompleted,
    })

  if (!updatedUser) throw new Error(UserError.UNEXPECTED_ERROR)
  return updatedUser
}

export async function updateUserAvatar(
  userId: number,
  { avatar }: UpdateAvatar,
) {
  const [updatedUser] = await db
    .update(userTable)
    .set({
      avatar,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId))
    .returning({
      id: userTable.id,
      email: userTable.email,
      username: userTable.username,
      avatar: userTable.avatar,
      name: userTable.name,
      locale: userTable.locale,
      onboardingCompleted: userTable.onboardingCompleted,
    })

  if (!updatedUser) throw new Error(UserError.UNEXPECTED_ERROR)
  return updatedUser
}

export async function deleteUser(userId: number) {
  const [userData] = await db
    .select({
      email: userTable.email,
      name: userTable.name,
      locale: userTable.locale,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!userData) throw new Error(UserError.NOT_FOUND)

  let username = "deleted_user"
  let i = 0

  while (true) {
    const existingUser = await db
      .select({ id: userTable.id })
      .from(userTable)
      .where(eq(userTable.username, username))
      .limit(1)

    if (existingUser.length === 0) break
    if (i === 19) throw new Error(UserError.UNEXPECTED_ERROR)

    username = `${username}_${Math.floor(1000 + Math.random() * 9000)}`
    i++
  }

  await db
    .update(userTable)
    .set({
      email: "deleted_user@skymo.online",
      username: username,
      name: "deleted_user",
      avatar: "owl",
      googleId: null,
      facebookId: null,
      updatedAt: new Date(),
      deletedAt: new Date(),
    })
    .where(eq(userTable.id, userId))

  await db
    .update(playerTable)
    .set({
      name: "deleted_user",
      avatar: "owl",
      userId: null,
    })
    .where(eq(playerTable.userId, userId))

  await mailerQueue.add("account-deleted", {
    to: userData.email,
    template: "account-deleted",
    locale: userData.locale,
    content: undefined,
  })
}
