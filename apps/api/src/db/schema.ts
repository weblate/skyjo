import type { InferSelectModel } from "drizzle-orm"
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
    username: varchar("username", { length: 20 }).notNull(),
    userTag: varchar("user_tag", { length: 20 }).notNull().unique(),
    password: varchar("password", { length: 255 }),
    googleId: varchar("google_id", { length: 255 }).unique(),
    facebookId: varchar("facebook_id", { length: 255 }).unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("email_idx").on(t.email),
    uniqueIndex("user_tag_idx").on(t.userTag),
  ],
)
export type User = InferSelectModel<typeof userTable>

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
export type Session = InferSelectModel<typeof sessionTable>

export const gameTable = pgTable("games", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 8 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})
export type Game = InferSelectModel<typeof gameTable>

export const playerTable = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id")
    .notNull()
    .references(() => gameTable.id),
  userId: integer("user_id").references(() => userTable.id),
  winner: boolean("winner"),
  avatar: avatarEnum("avatar").notNull(),
  username: varchar("username", { length: 20 }).notNull(),
  score: smallint("score").notNull().default(0),
  connectionStatus: smallint("connection_status").notNull().default(1),
})
export type Player = InferSelectModel<typeof playerTable>

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
  cards: json("cards"),
})
