import "server-only"

import { captureException } from "@sentry/nextjs"
import { Avatar } from "@skymo/core"
import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import type { VerifyError } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

export interface SessionData {
  id: number
  email: string
  name: string | null
  username: string | null
  avatar: Avatar
  hasOAuth: boolean
  onboardingCompleted: boolean
  role: "USER" | "ADMIN"
}

export const verifySession = async (): Promise<SessionData | null> => {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) return null

  try {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Cookie: `${SESSION_COOKIE_NAME}=${sessionCookie.value}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const error = await jsonError<VerifyError>(response)
      console.error("verifySession: Session verification failed", {
        status: response.status,
        statusText: response.statusText,
        error,
        url,
      })

      if (response.status >= 500) {
        captureException(
          new Error(`Session verification server error: ${response.status}`),
          {
            tags: {
              section: "auth",
              action: "server_session_verification",
            },
            extra: {
              status: response.status,
              statusText: response.statusText,
              error,
              url,
            },
          },
        )
      }

      return null
    }

    const data = await response.json()

    if (!data?.user) return null

    return data.user
  } catch (error) {
    console.error("verifySession: Network error", error)
    captureException(error, {
      tags: {
        section: "auth",
        action: "server_session_verification_network_error",
      },
      extra: {
        url: `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
      },
    })
    return null
  }
}

export const getUser = async (): Promise<SessionData> => {
  const session = await verifySession()

  if (!session) redirect("/login")

  return session
}
