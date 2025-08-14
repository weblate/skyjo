import { ENV } from "@env"
import type { Avatar, ConnectionStatus, SettingsRedisDb } from "@skymo/core"
import {
  accountDeletionTable,
  emailChangeTable,
  gameTable,
  passwordResetTable,
  playerTable,
  type UserDb,
  userTable,
} from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import { DEFAULT_GAME_SETTINGS, type Locales } from "@skymo/shared/constants"
import type {
  GameHistoryQuery,
  UpdateAvatar,
  UpdateEmail,
  UpdateName,
  UpdatePassword,
  UpdateUsername,
  UpdateUserSettings,
  UserSettings,
} from "@skymo/shared/validations"
import dayjs from "dayjs"
import { and, avg, count, eq, ne, sql, sum } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { db } from "@/db/index.js"
import { requestPasswordReset } from "@/http/auth/auth.service.js"
import { hashPassword, verifyPassword } from "@/http/auth/lib/password.js"
import { invalidateUserSessions } from "@/http/session/session.service.js"
import { accountDeletionQueue } from "@/utils/accountDeletion.js"
import { normalizeEmail } from "@/utils/emailNormalization.js"
import { mailerQueue } from "@/utils/mailer.js"
import { generateRandomToken, hashToken } from "@/utils/randomString.js"

interface GamePlayerResult {
  game_id: string
  game_code: string
  game_settings: SettingsRedisDb
  game_created_at: string
  game_finished_at: string
  player_name: string
  player_username: string | null
  player_avatar: Avatar
  player_rank: number
  player_forfeited: boolean
  player_forfeited_at: string | null
  player_connection_status: ConnectionStatus
  host_name: string
}

interface CreateUserParams {
  email: string
  name?: string
  username?: string
  googleId?: string
  locale?: Locales
  avatar?: Avatar
  emailVerified?: boolean
  password?: string
  settings?: UserSettings
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
  settings,
}: CreateUserParams): Promise<UserDb> {
  const createdName = name ?? null
  const createdUsername = username ?? (name ? await createUsername(name) : null)

  const finalSettings: UserSettings = {
    ...DEFAULT_GAME_SETTINGS,
    ...settings, // User-provided settings
    locale: settings?.locale ?? locale ?? DEFAULT_GAME_SETTINGS.locale,
  }

  const row = await db
    .insert(userTable)
    .values({
      email: email,
      name: createdName,
      username: createdUsername,
      password: password ? await hashPassword(password) : null,
      googleId: googleId ?? null,
      settings: finalSettings,
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
      settings: userTable.settings,
      avatar: userTable.avatar,
      emailVerified: userTable.emailVerified,
      onboardingCompleted: userTable.onboardingCompleted,
      role: userTable.role,
      createdAt: userTable.createdAt,
      updatedAt: userTable.updatedAt,
      deletedAt: userTable.deletedAt,
    })

  const user = row?.[0]
  if (!user) {
    throw new HTTPException(500, {
      message: "unexpected-error",
    })
  }

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
  const parsedUsername = name.slice(0, 15).toLowerCase()

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
    if (i === 19)
      throw new HTTPException(500, {
        message: "username-creation-failed",
      })
  }

  return username
}

export async function getUserByUsername(
  username: string,
): Promise<UserDb | null> {
  const [user] = await db
    .select()
    .from(userTable)
    .where(eq(userTable.username, username.toLowerCase()))
    .limit(1)

  if (!user) return null

  return user
}

export async function getUserGames(
  username: string,
  { limit = 10, offset = 0 }: GameHistoryQuery,
) {
  const gamePlayerResults = await db.execute(sql`
    WITH user_game_ids AS (
      SELECT DISTINCT g.id, g.finished_at
      FROM ${gameTable} g
      INNER JOIN ${playerTable} p ON g.id = p.game_id
      INNER JOIN ${userTable} u ON p.user_id = u.id
      WHERE LOWER(u.username) = LOWER(${username})
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
      p.forfeited as player_forfeited,
      p.forfeited_at as player_forfeited_at,
      p.connection_status as player_connection_status,
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
  const typedRows = gamePlayerResults.rows as unknown as GamePlayerResult[]

  for (const row of typedRows) {
    const gameId = row.game_id

    if (!gamesMap.has(gameId)) {
      gamesMap.set(gameId, {
        id: gameId,
        code: row.game_code,
        settings: row.game_settings,
        createdAt: row.game_created_at,
        finishedAt: row.game_finished_at,
        hostName: row.host_name,
        isPrivate: row.game_settings?.private || false,
        players: [],
      })
    }

    const game = gamesMap.get(gameId)

    if (
      row.player_username &&
      row.player_username.toLowerCase() === username.toLowerCase()
    ) {
      game.rank = row.player_rank
    }

    game.players.push({
      name: row.player_name,
      username: row.player_username,
      avatar: row.player_avatar,
      rank: row.player_rank,
      forfeited: row.player_forfeited,
      forfeitedAt: row.player_forfeited_at
        ? new Date(row.player_forfeited_at).getTime()
        : null,
      connectionStatus: row.player_connection_status,
    })
  }

  return Array.from(gamesMap.values())
}

export async function getUserStats(username: string) {
  const [publicResult] = await db
    .select({
      totalGames: count(playerTable.id),
      wins: sum(sql`CASE WHEN ${playerTable.winner} = true THEN 1 ELSE 0 END`),
      averageRank: avg(playerTable.rank),
    })
    .from(playerTable)
    .innerJoin(gameTable, eq(playerTable.gameId, gameTable.id))
    .innerJoin(userTable, eq(playerTable.userId, userTable.id))
    .where(
      and(
        eq(userTable.username, username),
        sql`(${gameTable.settings}->>'private')::boolean = false`,
      ),
    )

  const [privateResult] = await db
    .select({
      totalGames: count(playerTable.id),
      wins: sum(sql`CASE WHEN ${playerTable.winner} = true THEN 1 ELSE 0 END`),
      averageRank: avg(playerTable.rank),
    })
    .from(playerTable)
    .innerJoin(gameTable, eq(playerTable.gameId, gameTable.id))
    .innerJoin(userTable, eq(playerTable.userId, userTable.id))
    .where(
      and(
        eq(userTable.username, username),
        sql`(${gameTable.settings}->>'private')::boolean = true`,
      ),
    )
  const publicTotalGames = Number(publicResult?.totalGames ?? 0)
  const privateTotalGames = Number(privateResult?.totalGames ?? 0)
  const totalGames = publicTotalGames + privateTotalGames

  const publicWins = Number(publicResult?.wins ?? 0)
  const privateWins = Number(privateResult?.wins ?? 0)
  const totalWins = publicWins + privateWins

  const publicWinRate =
    publicTotalGames > 0 ? (publicWins / publicTotalGames) * 100 : 0
  const privateWinRate =
    privateTotalGames > 0 ? (privateWins / privateTotalGames) * 100 : 0
  const totalWinRate = totalGames > 0 ? (totalWins / totalGames) * 100 : 0

  const publicAverageRank = Number(publicResult?.averageRank ?? 0)
  const privateAverageRank = Number(privateResult?.averageRank ?? 0)
  const totalAverageRank =
    totalGames > 0
      ? (publicAverageRank * publicTotalGames +
          privateAverageRank * privateTotalGames) /
        totalGames
      : 0

  // If no games at all, return null
  if (publicTotalGames === 0 && privateTotalGames === 0) {
    return null
  }

  return {
    totalGames: {
      public: publicTotalGames,
      private: privateTotalGames,
      total: totalGames,
    },
    wins: {
      public: publicWins,
      private: privateWins,
      total: totalWins,
    },
    winRate: {
      public: publicWinRate,
      private: privateWinRate,
      total: totalWinRate,
    },
    averageRank: {
      public: publicAverageRank,
      private: privateAverageRank,
      total: totalAverageRank,
    },
  }
}

// User settings update functions
export async function updateName(userId: number, data: UpdateName) {
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
      settings: userTable.settings,
      onboardingCompleted: userTable.onboardingCompleted,
    })

  return updatedUser
}

export async function updateUsername(userId: number, data: UpdateUsername) {
  const existingUser = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(and(eq(userTable.username, data.username), ne(userTable.id, userId)))
    .limit(1)

  if (existingUser.length > 0) {
    throw new HTTPException(400, {
      message: "username-taken",
    })
  }

  const [updatedUser] = await db
    .update(userTable)
    .set({
      username: data.username.toLowerCase(),
      updatedAt: new Date(),
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
    })

  return updatedUser
}

export async function updateEmail(user: UserDb, data: UpdateEmail) {
  const oldEmail = user.email
  const newEmail = normalizeEmail(data.email)

  const reversionToken = generateRandomToken()
  const hashedReversionToken = hashToken(reversionToken)
  const expiresAt = dayjs().add(7, "days").toDate()

  const existingEmail = await db
    .select({ id: userTable.id })
    .from(userTable)
    .where(eq(userTable.email, newEmail))
    .limit(1)

  if (existingEmail.length > 0) {
    throw new HTTPException(400, {
      message: "email-already-exists",
    })
  }

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
  const reversionUrl = `${ENV.WEBSITE_URL}/revert-email/${encodeURIComponent(reversionToken)}`

  await mailerQueue.add("email-change-warning", {
    to: oldEmail,
    template: "email-change-warning",
    locale: user.settings?.locale ?? "en",
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
    settings: user.settings,
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
    throw new HTTPException(400, {
      message: "invalid-reversion-token",
    })
  }

  if (emailChange.expiresAt < new Date()) {
    await db
      .delete(emailChangeTable)
      .where(eq(emailChangeTable.id, emailChange.id))
    throw new HTTPException(400, {
      message: "expired-reversion-token",
    })
  }

  const [userData] = await db
    .select({
      settings: userTable.settings,
    })
    .from(userTable)
    .where(eq(userTable.id, emailChange.userId))
    .limit(1)

  if (!userData) {
    Logger.error("User not found", {
      userId: emailChange.userId,
    })
    return
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
}

export async function updatePassword(userId: number, data: UpdatePassword) {
  const [user] = await db
    .select({ password: userTable.password })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!user?.password)
    throw new HTTPException(400, {
      message: "invalid-current-password",
    })

  const isValidPassword = await verifyPassword(
    user.password,
    data.currentPassword,
  )
  if (!isValidPassword)
    throw new HTTPException(400, {
      message: "invalid-current-password",
    })

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
      settings: userTable.settings,
      onboardingCompleted: userTable.onboardingCompleted,
    })

  return updatedUser
}

export async function updateAvatar(userId: number, { avatar }: UpdateAvatar) {
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
      settings: userTable.settings,
      onboardingCompleted: userTable.onboardingCompleted,
    })

  return updatedUser
}

export async function scheduleAccountDeletion(userId: number) {
  const [userData] = await db
    .select({
      id: userTable.id,
      email: userTable.email,
      name: userTable.name,
      settings: userTable.settings,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!userData)
    throw new HTTPException(404, {
      message: "user-not-found",
    })

  const [existingRequest] = await db
    .select()
    .from(accountDeletionTable)
    .where(eq(accountDeletionTable.userId, userId))
    .limit(1)

  if (existingRequest) {
    throw new HTTPException(400, {
      message: "account-deletion-already-scheduled",
    })
  }

  const cancellationToken = generateRandomToken(64)
  const hashedToken = hashToken(cancellationToken)
  const delay = 48 * 60 * 60 * 1000 // 48 hours
  const expiresAt = dayjs().add(delay, "ms").toDate()

  const job = await accountDeletionQueue.add(
    `delete-account-${userId}`,
    {
      userId: userData.id,
    },
    {
      delay,
      jobId: `delete-account-${userId}`,
    },
  )

  if (!job?.id) {
    throw new HTTPException(500, {
      message: "account-deletion-schedule-failed",
    })
  }

  // Store the deletion request in the database
  try {
    await db.insert(accountDeletionTable).values({
      userId: userData.id,
      jobId: job.id,
      token: hashedToken,
      expiresAt: expiresAt,
    })
  } catch (error) {
    // Clean up the job if database insert fails
    await accountDeletionQueue.remove(job.id)
    throw error
  }

  const cancellationUrl = `${process.env.FRONTEND_URL}/cancel-account-deletion/${cancellationToken}`

  await mailerQueue.add("account-deletion-scheduled", {
    to: userData.email,
    template: "account-deletion-scheduled",
    locale: userData.settings?.locale ?? "en",
    content: {
      cancellationUrl,
    },
  })

  Logger.info(`Account deletion scheduled for user ${userId}`, {
    userId,
    userEmail: userData.email,
    jobId: job.id,
    expiresAt,
  })
}

export async function cancelAccountDeletion(token: string) {
  const hashedToken = hashToken(token)

  const [deletionRequest] = await db
    .select({
      id: accountDeletionTable.id,
      userId: accountDeletionTable.userId,
      jobId: accountDeletionTable.jobId,
      expiresAt: accountDeletionTable.expiresAt,
    })
    .from(accountDeletionTable)
    .where(eq(accountDeletionTable.token, hashedToken))
    .limit(1)

  if (!deletionRequest) {
    throw new HTTPException(400, {
      message: "invalid-cancellation-token",
    })
  }

  if (deletionRequest.expiresAt < new Date()) {
    // Clean up expired request
    await db
      .delete(accountDeletionTable)
      .where(eq(accountDeletionTable.id, deletionRequest.id))
    throw new HTTPException(400, {
      message: "expired-cancellation-token",
    })
  }

  // Remove the scheduled job from the queue
  try {
    await accountDeletionQueue.remove(deletionRequest.jobId)
  } catch (error) {
    Logger.warn(`Failed to remove job ${deletionRequest.jobId} from queue`, {
      jobId: deletionRequest.jobId,
      error,
    })
  }

  await db
    .delete(accountDeletionTable)
    .where(eq(accountDeletionTable.id, deletionRequest.id))

  Logger.info(`Account deletion cancelled for user ${deletionRequest.userId}`, {
    userId: deletionRequest.userId,
    jobId: deletionRequest.jobId,
  })
}

// Settings related functions
export async function getUserSettings(
  userId: number,
): Promise<UserSettings | null> {
  const [user] = await db
    .select({
      settings: userTable.settings,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!user?.settings) return null

  return user.settings
}

export async function updateUserSettings(
  userId: number,
  data: UpdateUserSettings,
): Promise<UserSettings | null> {
  const [user] = await db
    .select({
      settings: userTable.settings,
    })
    .from(userTable)
    .where(eq(userTable.id, userId))
    .limit(1)

  if (!user)
    throw new HTTPException(404, {
      message: "user-not-found",
    })

  const currentSettings = (user.settings as UserSettings) || {}
  const newSettings = { ...currentSettings, ...data.settings }

  const [updatedUser] = await db
    .update(userTable)
    .set({
      settings: newSettings,
      updatedAt: new Date(),
    })
    .where(eq(userTable.id, userId))
    .returning({
      settings: userTable.settings,
    })

  return updatedUser?.settings as UserSettings
}
