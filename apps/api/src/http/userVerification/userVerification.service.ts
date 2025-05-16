import { randomInt } from "crypto"
import { db } from "@/db/index.js"
import { userTable, userVerificationTable } from "@/db/schema.js"
import { mailerQueue } from "@/utils/mailer.js"
import { Logger } from "@skymo/logger"
import { UserError } from "@skymo/shared/constants"
import { and, eq, lt } from "drizzle-orm"

export async function sendVerifyPin(email: string) {
  const user = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)

  // If the user does not exist, do nothing. This prevents giving away information about whether an email is registered or not.
  if (user.length === 0) {
    Logger.error(
      "User not found when sending verify pin. This shouldn't happen since the function is behind authMiddleware.",
      {
        email,
      },
    )
    throw new Error(UserError.UNEXPECTED_ERROR)
  }

  const locale = user[0].locale

  const pin = await generateVerifyPin(email)

  await mailerQueue.add("verify-pin", {
    to: email,
    template: "verify-pin",
    locale,
    content: {
      pin,
    },
  })
}

export async function generateVerifyPin(email: string) {
  const user = await db
    .select()
    .from(userTable)
    .where(eq(userTable.email, email))
    .limit(1)

  if (user.length === 0) {
    throw new Error(UserError.NOT_FOUND)
  }

  const pin = randomInt(0, 1000000).toString().padStart(6, "0")
  // 10 minutes
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10)
  await db.insert(userVerificationTable).values({
    pin,
    userId: user[0].id,
    expiresAt,
  })

  return pin
}

export async function verifyPin(email: string, pin: string) {
  const result = await db
    .select()
    .from(userVerificationTable)
    .innerJoin(userTable, eq(userVerificationTable.userId, userTable.id))
    .where(
      and(
        eq(userVerificationTable.pin, pin),
        eq(userTable.email, email),
        lt(userVerificationTable.expiresAt, new Date()),
      ),
    )
    .limit(1)

  const user = result?.[0]
  if (!user) return false

  await db
    .update(userTable)
    .set({ emailVerified: true })
    .where(eq(userTable.id, user.user_verifications.userId))

  await db
    .delete(userVerificationTable)
    .where(eq(userVerificationTable.id, user.user_verifications.id))

  return true
}
