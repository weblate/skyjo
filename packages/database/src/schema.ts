import type { PlayerScore, SettingsRedisDb } from "@skymo/core"
import type { UserSettings } from "@skymo/shared/validations"
import { eq, type InferSelectModel, relations, sql } from "drizzle-orm"
import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
  pgView,
  serial,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core"

export const avatarEnum = pgEnum("avatar", [
  "bee",
  "crab",
  "dog",
  "eagle",
  "elephant",
  "fox",
  "frog",
  "jellyfish",
  "koala",
  "octopus",
  "penguin",
  "toucan",
  "turtle",
  "whale",
  "owl",
  "cat",
])

export const roleEnum = pgEnum("role", ["USER", "ADMIN"])
export type UserRole = (typeof roleEnum.enumValues)[number]

export const userTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    avatar: avatarEnum("avatar").notNull().default("bee"),
    name: varchar("name", { length: 20 }),
    username: varchar("username", { length: 20 }).unique(),
    role: roleEnum("role").notNull().default("USER"),
    password: varchar("password", { length: 255 }),
    googleId: varchar("google_id", { length: 255 }).unique(),
    facebookId: varchar("facebook_id", { length: 255 }).unique(),
    settings: json("settings").$type<UserSettings>(),
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("email_idx").on(t.email),
    uniqueIndex("username_idx").on(t.username),
  ],
)
export type UserDb = Omit<InferSelectModel<typeof userTable>, "password">
export type UserWithPasswordDb = InferSelectModel<typeof userTable>

export const userVerificationTable = pgTable("user_verifications", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  pin: varchar("pin", { length: 6 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
})
export type UserVerificationDb = InferSelectModel<typeof userVerificationTable>

export const passwordResetTable = pgTable("password_resets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
})
export type PasswordResetDb = InferSelectModel<typeof passwordResetTable>

export const emailChangeTable = pgTable("email_changes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
  oldEmail: varchar("old_email", { length: 255 }).notNull(),
  newEmail: varchar("new_email", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
})
export type EmailChangeDb = InferSelectModel<typeof emailChangeTable>

export const accountDeletionTable = pgTable("account_deletions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
  jobId: varchar("job_id", { length: 255 }).notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
})
export type AccountDeletionDb = InferSelectModel<typeof accountDeletionTable>

export const sessionTable = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
    mode: "date",
  }).notNull(),
})
export type SessionDb = InferSelectModel<typeof sessionTable>

export const gameTable = pgTable("games", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 8 }),
  hostId: integer("host_id"),
  settings: json("settings").$type<SettingsRedisDb>(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { mode: "date" }).notNull().defaultNow(),
})
export const gameRelations = relations(gameTable, ({ one }) => ({
  host: one(playerTable, {
    fields: [gameTable.hostId],
    references: [playerTable.id],
    relationName: "host",
  }),
}))

export type GameDb = InferSelectModel<typeof gameTable>

export const playerTable = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id")
    .notNull()
    .references(() => gameTable.id),
  userId: integer("user_id").references(() => userTable.id),
  guestId: varchar("guest_id", { length: 255 }),
  winner: boolean("winner"),
  avatar: avatarEnum("avatar").notNull(),
  name: varchar("name", { length: 20 }).notNull(),
  score: smallint("score").notNull().default(0),
  rank: smallint("rank").notNull(),
  connectionStatus: smallint("connection_status").notNull().default(1),
  forfeited: boolean("forfeited").notNull().default(false),
  forfeitedAt: timestamp("forfeited_at", { mode: "date" }),
})
export type PlayerDb = InferSelectModel<typeof playerTable>

export const scoreTable = pgTable("scores", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id")
    .notNull()
    .references(() => gameTable.id),
  playerId: integer("player_id")
    .notNull()
    .references(() => playerTable.id),
  score: json("score").$type<PlayerScore>().notNull(),
  round: integer("round").notNull(),
})
export type ScoreDb = InferSelectModel<typeof scoreTable>

export const reportReasonEnum = pgEnum("report_reason", [
  "inappropriate-username",
  "toxic-behavior",
  "spam-advertising",
  "cheating-exploiting",
  "harassment",
  "other",
])

export type reportData = {
  reporterId: string
  reporterName: string
  reportedPlayerId: string
  reportedPlayerName: string
  gameCode: string
  gameContext?: {
    players: Array<{
      id: string
      name: string
      username?: string
      connectionStatus: number
    }>
    messages: Array<{
      id: string
      message: string
      name?: string
      timestamp: string
    }>
  }
}
export const reportTable = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => userTable.id),
  guestId: varchar("guest_id", { length: 255 }),
  reason: reportReasonEnum("reason").default("other").notNull(),
  comment: varchar("comment", { length: 500 }),
  reportData: json("report_data").$type<reportData>().notNull(),
  validation: boolean("validation"),
  moderatorComment: varchar("moderator_comment", { length: 500 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
})
export type ReportDb = InferSelectModel<typeof reportTable>

export const penaltyTypeEnum = pgEnum("penalty_type", [
  "leavebuster",
  "chat_restrict",
  "tempban",
  "ban",
])
export type PenaltyType = (typeof penaltyTypeEnum.enumValues)[number]

export const penaltyTable = pgTable("penalties", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => userTable.id),
  guestId: varchar("guest_id", { length: 255 }),
  reportId: integer("report_id").references(() => reportTable.id),
  type: penaltyTypeEnum("type").notNull(),
  level: integer("level"), // Only for leavebuster (1-5)
  reason: text("reason").notNull(),
  // For counter-based leavebuster
  completionsRequired: integer("completions_required"),
  completionsDone: integer("completions_done").default(0),
  // For time-based penalties (chat_restrict, tempban)
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
export type PenaltyDb = InferSelectModel<typeof penaltyTable>

export const leaderboardView = pgView("leaderboard_view").as((qb) => {
  return qb
    .select({
      rank: sql<number>`row_number() over (order by round((count(case when ${playerTable.winner} = true then 1 end) * 100.0 / count(*)), 2) desc, count(case when ${playerTable.winner} = true then 1 end) desc, count(*) desc, avg(${playerTable.score}) asc)`.as(
        "rank",
      ),
      userId: userTable.id,
      name: userTable.name,
      username: userTable.username,
      avatar: userTable.avatar,
      wins: sql<number>`count(case when ${playerTable.winner} = true then 1 end)`.as(
        "wins",
      ),
      totalGames: sql<number>`count(*)`.as("total_games"),
      winRate:
        sql<number>`round((count(case when ${playerTable.winner} = true then 1 end) * 100.0 / count(*)), 2)`.as(
          "win_rate",
        ),
    })
    .from(userTable)
    .innerJoin(playerTable, eq(userTable.id, playerTable.userId))
    .where(
      sql`${userTable.deletedAt} is null and ${playerTable.userId} is not null`,
    )
    .groupBy(userTable.id, userTable.name, userTable.username, userTable.avatar)
    .having(sql`count(*) >= 10`)
    .orderBy(
      sql`round((count(case when ${playerTable.winner} = true then 1 end) * 100.0 / count(*)), 2) desc`,
      sql`count(case when ${playerTable.winner} = true then 1 end) desc`,
      sql`count(*) desc`,
      sql`avg(${playerTable.score}) asc`,
    )
})
