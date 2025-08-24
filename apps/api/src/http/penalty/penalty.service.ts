import type { Player } from "@skymo/core"
import { type PenaltyDb, penaltyTable } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import type { CreatePenalty } from "@skymo/shared/validations"
import dayjs from "dayjs"
import { and, eq, gte, isNull, lt, ne, or, sql } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { db } from "@/db/index.js"

export const LEAVEBUSTER_CONFIG = {
  1: { completions: 1, duration: 10 }, // 1 time, 10 seconds
  2: { completions: 5, duration: 30 }, // 5 times, 30 seconds each
  3: { completions: 5, duration: 60 }, // 5 times, 1 minute each
  4: { completions: 5, duration: 180 }, // 5 times, 3 minutes each
  5: { completions: 5, duration: 300 }, // 5 times, 5 minutes each
} as const

export async function createPenalty(data: CreatePenalty): Promise<PenaltyDb> {
  if (!data.targetUserId && !data.targetGuestId) {
    throw new Error("Either targetUserId or targetGuestId must be provided")
  }

  const penaltyData: Partial<
    Pick<
      PenaltyDb,
      "level" | "completionsRequired" | "completionsDone" | "expiresAt"
    >
  > = {}

  switch (data.type) {
    case "leavebuster":
      const level = data.level || 1
      const config =
        LEAVEBUSTER_CONFIG[level as keyof typeof LEAVEBUSTER_CONFIG]

      penaltyData.completionsRequired = config.completions
      penaltyData.completionsDone = 0
      penaltyData.expiresAt = null
      break
    case "chat_restrict":
    case "tempban":
      if (!data.durationMinutes) {
        throw new HTTPException(400, {
          message: "Duration required for time-based penalties",
        })
      }
      penaltyData.level = null
      penaltyData.expiresAt = dayjs()
        .add(data.durationMinutes, "minutes")
        .toDate()
      break
    case "ban":
      penaltyData.level = null
      penaltyData.expiresAt = null
      break

    default:
      throw new Error(`Unsupported penalty type: ${data.type}`)
  }

  const [penalty] = await db
    .insert(penaltyTable)
    .values({
      userId: data.targetUserId || null,
      guestId: data.targetGuestId || null,
      type: data.type,
      reason: data.reason || "no reason",
      reportId: data.reportId || null,
      ...penaltyData,
    })
    .returning()

  Logger.info("Applied penalty", {
    type: data.type,
    userId: data.targetUserId,
    guestId: data.targetGuestId,
    reason: data.reason,
  })

  return penalty
}

export async function getActivePenalties(
  userId?: number,
  guestId?: string,
): Promise<PenaltyDb[]> {
  if (!userId && !guestId) return []

  const conditions = []
  if (userId) conditions.push(eq(penaltyTable.userId, userId))
  if (guestId) conditions.push(eq(penaltyTable.guestId, guestId))

  const penalties = await db
    .select()
    .from(penaltyTable)
    .where(
      and(
        or(...conditions),
        or(
          // Leavebuster: active if completions not done
          and(
            eq(penaltyTable.type, "leavebuster"),
            lt(penaltyTable.completionsDone, penaltyTable.completionsRequired),
          ),
          // Other penalties: active if not expired
          and(
            ne(penaltyTable.type, "leavebuster"),
            or(
              isNull(penaltyTable.expiresAt),
              gte(penaltyTable.expiresAt, new Date()),
            ),
          ),
        ),
      ),
    )

  return penalties
}

export async function getPenaltyById(
  penaltyId: number,
): Promise<PenaltyDb | null> {
  const [penalty] = await db
    .select()
    .from(penaltyTable)
    .where(eq(penaltyTable.id, penaltyId))
    .limit(1)

  return penalty || null
}

export async function canChat(player: Player): Promise<boolean> {
  const penalties = await getActivePenalties(player.userId, player.guestId)
  return !penalties.some((p) => p.type === "chat_restrict")
}

export async function completeLeavebuster(
  penaltyId: number,
): Promise<PenaltyDb> {
  const [updated] = await db
    .update(penaltyTable)
    .set({
      completionsDone: sql`${penaltyTable.completionsDone} + 1`,
    })
    .where(eq(penaltyTable.id, penaltyId))
    .returning()

  // If all completions done, set expiresAt to now (marks as completed but keeps history)
  if (
    updated.completionsDone &&
    updated.completionsRequired &&
    updated.completionsDone >= updated.completionsRequired
  ) {
    const [finalUpdate] = await db
      .update(penaltyTable)
      .set({
        expiresAt: new Date(), // Mark as expired/completed
      })
      .where(eq(penaltyTable.id, penaltyId))
      .returning()

    return finalUpdate
  }

  return updated
}

export async function calculateLeavebusterLevel(
  userId?: number,
  guestId?: string,
): Promise<number> {
  if (!userId && !guestId) return 1

  const conditions = []
  if (userId) conditions.push(eq(penaltyTable.userId, userId))
  if (guestId) conditions.push(eq(penaltyTable.guestId, guestId))

  // Count leavebuster penalties in the last 30 days
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const recentPenalties = await db
    .select({ count: sql<number>`count(*)` })
    .from(penaltyTable)
    .where(
      and(
        or(...conditions),
        eq(penaltyTable.type, "leavebuster"),
        gte(penaltyTable.createdAt, thirtyDaysAgo),
      ),
    )

  const count = recentPenalties[0]?.count || 0
  return Math.min(count + 1, 5) // Cap at level 5
}

export async function applyLeavebuster(
  userId: number | undefined,
  guestId: string | undefined,
  level?: number,
): Promise<PenaltyDb> {
  if (!userId && !guestId) {
    throw new Error("Either userId or guestId must be provided")
  }

  const penaltyLevel =
    level || (await calculateLeavebusterLevel(userId, guestId))
  const config =
    LEAVEBUSTER_CONFIG[penaltyLevel as keyof typeof LEAVEBUSTER_CONFIG]

  const [penalty] = await db
    .insert(penaltyTable)
    .values({
      userId: userId || null,
      guestId: guestId || null,
      type: "leavebuster",
      level: penaltyLevel,
      completionsRequired: config.completions,
      completionsDone: 0,
      reason: "Left public game without returning",
      expiresAt: null,
    })
    .returning()

  Logger.info("Applied leavebuster penalty", {
    userId,
    guestId,
    level: penaltyLevel,
    completions: config.completions,
  })

  return penalty
}

export async function acknowledgePenalty(penaltyId: number): Promise<void> {
  const now = new Date()

  await db
    .update(penaltyTable)
    .set({ acknowledgedAt: now })
    .where(eq(penaltyTable.id, penaltyId))

  Logger.info(`Penalty acknowledged`, { penaltyId, acknowledgedAt: now })
}
