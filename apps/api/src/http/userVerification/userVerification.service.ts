import { randomInt } from "crypto"
import { db } from "@/db/index.js"
import { mailerQueue } from "@/utils/mailer.js"
import {
  type UserDb,
  userTable,
  userVerificationTable,
} from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import dayjs from "dayjs"
import { and, eq } from "drizzle-orm"

export async function sendVerifyPin(email: string) {
  const userResult = await db
    .select()
    .from(userTable)
    .where(and(eq(userTable.email, email), eq(userTable.emailVerified, false)))
    .limit(1)

  const user = userResult?.[0]
  if (!user) {
    Logger.info("User not found or already verified", {
      email,
    })

    return
  }

  const locale = user.locale

  const pin = await generateVerifyPin(user)

  await mailerQueue.add("verify-pin", {
    to: email,
    template: "verify-pin",
    locale,
    content: {
      pin,
    },
  })
}

export async function generateVerifyPin(user: UserDb) {
  const pin = randomInt(0, 1000000).toString().padStart(6, "0")
  // 10 minutes
  const expiresAt = dayjs().add(10, "minutes").toDate()

  const existingPinResult = await db
    .select()
    .from(userVerificationTable)
    .where(eq(userVerificationTable.userId, user.id))
    .limit(1)

  const existingPin = existingPinResult?.[0]
  if (existingPin) {
    await db
      .update(userVerificationTable)
      .set({ pin, expiresAt })
      .where(eq(userVerificationTable.id, existingPin.id))

    return pin
  }

  await db.insert(userVerificationTable).values({
    pin,
    userId: user.id,
    expiresAt,
  })

  return pin
}

export async function verifyPin(email: string, pin: string) {
  const [result] = await db
    .select()
    .from(userVerificationTable)
    .innerJoin(userTable, eq(userVerificationTable.userId, userTable.id))
    .where(and(eq(userVerificationTable.pin, pin), eq(userTable.email, email)))
    .limit(1)

  if (!result) {
    throw new Error("invalid-pin")
  }

  const { users: user, user_verifications } = result

  // If the pin has expired, generate a new one and return unsuccessful
  if (user_verifications.expiresAt < new Date()) {
    await generateVerifyPin(user)

    throw new Error("expired-pin")
  }

  await db
    .update(userTable)
    .set({ emailVerified: true })
    .where(eq(userTable.id, user_verifications.userId))

  await db
    .delete(userVerificationTable)
    .where(eq(userVerificationTable.id, user_verifications.id))
}
