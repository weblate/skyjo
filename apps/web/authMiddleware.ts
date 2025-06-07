import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import { NextRequest, NextResponse } from "next/server"

async function NotAuthenticated() {
  return NextResponse.redirect(
    new URL(`/login`, process.env.NEXT_PUBLIC_SITE_URL),
  )
}

type UserData = {
  emailVerified: boolean
  username?: string | null
  avatar?: string | null
  hasOAuth?: boolean
  onboardingCompleted?: boolean
}

function handleRedirects(
  request: NextRequest,
  userData: UserData,
): NextResponse {
  const pathname = request.nextUrl.pathname

  // If they're not verified and not on the verify page, redirect to verify
  if (!userData.emailVerified && !pathname.includes("/verify")) {
    return NextResponse.redirect(
      new URL(`/verify`, process.env.NEXT_PUBLIC_SITE_URL),
    )
  }

  // If they're verified but haven't completed onboarding, redirect to onboarding
  if (
    userData.emailVerified &&
    !userData.onboardingCompleted &&
    !pathname.includes("/onboard")
  ) {
    return NextResponse.redirect(
      new URL(`/onboard`, process.env.NEXT_PUBLIC_SITE_URL),
    )
  }

  // If they're verified and on the verify page, redirect to home
  if (userData.emailVerified && pathname.includes("/verify")) {
    return NextResponse.redirect(
      new URL(`/`, process.env.NEXT_PUBLIC_SITE_URL),
    )
  }

  // If they've completed onboarding and are on the onboarding page, redirect to home
  if (
    userData.emailVerified &&
    userData.onboardingCompleted &&
    pathname.includes("/onboard")
  ) {
    return NextResponse.redirect(
      new URL(`/`, process.env.NEXT_PUBLIC_SITE_URL),
    )
  }

  return NextResponse.next()
}

export async function authMiddleware(request: NextRequest) {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME)?.value
  if (!cookie) {
    return await NotAuthenticated()
  }

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/auth/verify`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: `${SESSION_COOKIE_NAME}=${cookie}` } : {}),
      },
    },
  )

  if (!response.ok) {
    const redirectResponse = await NotAuthenticated()
    redirectResponse.cookies.delete(SESSION_COOKIE_NAME)

    return redirectResponse
  }

  const data = await response.json()
  return handleRedirects(request, data.user)
}
