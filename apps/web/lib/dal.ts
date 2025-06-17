import "server-only"

import { Avatar } from "@skymo/core"
import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import type { VerifyError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { cache } from "react"

export interface SessionData {
  emailVerified: boolean
  email: string
  name: string | null
  username: string | null
  avatar: Avatar
  hasOAuth: boolean
  onboardingCompleted: boolean
}

export const verifySession = cache(async (): Promise<SessionData | null> => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) return null

  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
      {
        method: "POST",
        headers: {
          Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
        },
      },
    )

    if (!response.ok) {
      const error = await jsonError<VerifyError>(response)
      console.error("Session verification failed:", error)
      return null
    }

    const data = await response.json()
    return data.user
  } catch (error) {
    console.error("Session verification failed:", error)
    return null
  }
})

export const getUser = cache(async (): Promise<SessionData> => {
  const session = await verifySession()

  if (!session) redirect("/login")

  return session
})

export const requireEmailVerified = cache(async (): Promise<SessionData> => {
  const session = await getUser()

  if (!session.emailVerified) redirect("/verify")

  return session
})

export const requireOnboardingCompleted = cache(
  async (): Promise<SessionData> => {
    const session = await requireEmailVerified()

    if (!session.onboardingCompleted) redirect("/onboard")

    return session
  },
)

// Check if user is authenticated without redirecting
export const isAuthenticated = cache(async (): Promise<boolean> => {
  const session = await verifySession()

  return !!session
})

// Check if user has completed email verification without redirecting
export const isEmailVerified = cache(async (): Promise<boolean> => {
  const session = await verifySession()

  return !!session?.emailVerified
})

// Check if user has completed onboarding without redirecting
export const hasCompletedOnboarding = cache(async (): Promise<boolean> => {
  const session = await verifySession()

  return !!session?.onboardingCompleted
})
