import { randomUUID } from "node:crypto"
import { ENV } from "@env"
import { GUEST_ID_COOKIE_NAME } from "@skymo/shared/constants"
import type { Context } from "hono"
import { getCookie, setCookie } from "hono/cookie"

/**
 * Gets the guest ID from the cookie or creates a new one if it doesn't exist.
 * Guest IDs are used to track penalties for non-authenticated users.
 */
export function getOrCreateGuestId(c: Context): string {
  const existingGuestId = getCookie(c, GUEST_ID_COOKIE_NAME)

  if (existingGuestId) {
    return existingGuestId
  }

  const newGuestId = randomUUID()
  setCookie(c, GUEST_ID_COOKIE_NAME, newGuestId, {
    path: "/",
    httpOnly: true,
    secure: ENV.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    domain: ENV.GUEST_COOKIE_DOMAIN,
  })

  return newGuestId
}

/**
 * Gets the guest ID from the cookie without creating a new one.
 * Returns undefined if no guest ID exists.
 */
export function getGuestId(c: Context): string | undefined {
  return getCookie(c, GUEST_ID_COOKIE_NAME)
}
