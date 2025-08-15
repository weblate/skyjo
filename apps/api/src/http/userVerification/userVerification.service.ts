import { userVerificationTable } from "@skymo/database/schema"
import { type Locales } from "@skymo/shared/constants"
import { randomInt } from "crypto"
import dayjs from "dayjs"
import { eq } from "drizzle-orm"
import { HTTPException } from "hono/http-exception"
import { db } from "@/db/index.js"
import { mailerQueue } from "@/utils/mailer.js"

export async function sendVerifyPin(email: string, locale: Locales = "en") {
  // Check if email was already sent in the last 5 minutes
  const [existingVerification] = await db
    .select()
    .from(userVerificationTable)
    .where(eq(userVerificationTable.email, email))
    .limit(1)

  const oneMinuteAgo = dayjs().subtract(1, "minute").toDate()
  const isRecent =
    existingVerification?.createdAt &&
    existingVerification.createdAt > oneMinuteAgo

  if (existingVerification && isRecent) return

  const pin = await generateVerifyPin(email)

  // Use the same template for both cases for now
  const template = "verify-pin"

  await mailerQueue.add("verify-pin", {
    to: email,
    template,
    locale,
    content: {
      pin,
    },
  })
}

export async function generateVerifyPin(email: string) {
  const pin = randomInt(0, 1000000).toString().padStart(6, "0")
  const expiresAt = dayjs().add(20, "minutes").toDate()

  const existingPinResult = await db
    .select()
    .from(userVerificationTable)
    .where(eq(userVerificationTable.email, email))
    .limit(1)

  const existingPin = existingPinResult?.[0]
  if (existingPin) {
    await db
      .update(userVerificationTable)
      .set({ pin, createdAt: new Date(), expiresAt })
      .where(eq(userVerificationTable.id, existingPin.id))
  } else {
    await db.insert(userVerificationTable).values({
      pin,
      email,
      expiresAt,
    })
  }

  return pin
}

export async function verifyPin(email: string, pin: string) {
  const [verificationResult] = await db
    .select()
    .from(userVerificationTable)
    .where(eq(userVerificationTable.email, email))
    .limit(1)

  if (!verificationResult || verificationResult.pin !== pin) {
    throw new HTTPException(400, {
      message: "invalid-pin",
    })
  }

  if (verificationResult.expiresAt < new Date()) {
    await generateVerifyPin(email)

    throw new HTTPException(400, {
      message: "expired-pin",
    })
  }

  await db
    .delete(userVerificationTable)
    .where(eq(userVerificationTable.id, verificationResult.id))

  return verificationResult
}
