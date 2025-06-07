import type { SettingsRedisDb } from "@skymo/core"
import { locales } from "@skymo/shared/constants"
import { type InferSelectModel, relations } from "drizzle-orm"
import {
  boolean,
  integer,
  json,
  pgEnum,
  pgTable,
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

export const userTable = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    avatar: avatarEnum("avatar").notNull().default("bee"),
    name: varchar("name", { length: 20 }),
    username: varchar("username", { length: 20 }).unique(),
    password: varchar("password", { length: 255 }),
    googleId: varchar("google_id", { length: 255 }).unique(),
    facebookId: varchar("facebook_id", { length: 255 }).unique(),
    locale: varchar("locale", { length: 10, enum: locales })
      .notNull()
      .default("en"),
    emailVerified: boolean("email_verified").notNull().default(false),
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
export type UserDb = Omit<
  InferSelectModel<typeof userTable>,
  "password" | "verifyPin"
>
export type UserWithPasswordDb = InferSelectModel<typeof userTable>

export const userVerificationTable = pgTable("user_verifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => userTable.id),
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
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
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
  winner: boolean("winner"),
  avatar: avatarEnum("avatar").notNull(),
  name: varchar("name", { length: 20 }).notNull(),
  score: smallint("score").notNull().default(0),
  rank: smallint("rank").notNull(),
  connectionStatus: smallint("connection_status").notNull().default(1),
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
  score: varchar("score").notNull(),
  round: integer("round").notNull(),
})
export type ScoreDb = InferSelectModel<typeof scoreTable>
