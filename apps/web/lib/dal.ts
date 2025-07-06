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

export const verifySession = async (): Promise<SessionData | null> => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  // Enhanced debugging for cookie handling
  if (!sessionCookie?.value) {
    console.log("verifySession: No session cookie found", {
      cookieExists: !!sessionCookie,
      cookieValue: sessionCookie?.value ? "[PRESENT]" : "[MISSING]",
      cookieName: SESSION_COOKIE_NAME,
      allCookies: Object.keys(cookieStore.getAll()).join(", "),
    })
    return null
  }

  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`
    console.log("verifySession: Making request to", url)

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })

    console.log(
      "verifySession: Response status",
      response.status,
      response.statusText,
    )

    if (!response.ok) {
      const error = await jsonError<VerifyError>(response)
      console.error("verifySession: Session verification failed", {
        status: response.status,
        statusText: response.statusText,
        error,
        url,
      })
      return null
    }

    const data = await response.json()
    console.log("verifySession: Response data structure", {
      hasUser: !!data.user,
      userKeys: data.user ? Object.keys(data.user) : [],
      rawDataKeys: Object.keys(data),
    })

    // Validate response structure
    if (!data?.user) {
      console.error("verifySession: Invalid response structure", {
        hasData: !!data,
        hasUser: !!data?.user,
        responseKeys: data ? Object.keys(data) : [],
      })
      return null
    }

    return data.user
  } catch (error) {
    console.error("verifySession: Session verification failed with exception", {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      cookiePresent: !!sessionCookie?.value,
    })
    return null
  }
}

export const getUser = cache(async (): Promise<SessionData> => {
  const session = await verifySession()

  if (!session) redirect("/login")

  return session
})
