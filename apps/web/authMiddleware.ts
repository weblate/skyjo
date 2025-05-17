import { SESSION_COOKIE_NAME } from "@skymo/shared/constants"
import { NextRequest, NextResponse } from "next/server"

async function NotAuthenticated() {
  return NextResponse.redirect(
    new URL(`/login`, process.env.NEXT_PUBLIC_SITE_URL),
  )
}

type UserData = {
  emailVerified: boolean
}

function handleRedirects(
  request: NextRequest,
  userData: UserData,
): NextResponse | undefined {
  const pathname = request.nextUrl.pathname
  const pathnameWithoutLocale = pathname.replace(/^\/(fr|en)/, "")

  // Email verification redirect logic
  if (!userData.emailVerified) {
    // If they're not on the verify page, redirect them there
    if (pathnameWithoutLocale !== "/verify") {
      return NextResponse.redirect(
        new URL(`/verify`, process.env.NEXT_PUBLIC_SITE_URL),
      )
    }
  } else if (pathnameWithoutLocale === "/verify") {
    // If email is verified and they're on verify page, redirect to onboard
    return NextResponse.redirect(
      new URL(`/profile`, process.env.NEXT_PUBLIC_SITE_URL),
    )
  }
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
  const redirectResponse = handleRedirects(request, data.user)
  if (redirectResponse) return redirectResponse

  return NextResponse.next()
}
