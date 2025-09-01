import { GUEST_ID_COOKIE_NAME } from "@skymo/shared/constants"
import { type NextRequest } from "next/server"
import createNextIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

const nextIntlMiddleware = createNextIntlMiddleware(routing)

export function middleware(request: NextRequest) {
  // Create guestId cookie if it doesn't exist
  const response = nextIntlMiddleware(request)

  if (!request.cookies.has(GUEST_ID_COOKIE_NAME)) {
    const guestId = crypto.randomUUID()
    response.cookies.set(GUEST_ID_COOKIE_NAME, guestId, {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      domain: process.env.GUEST_COOKIE_DOMAIN,
    })
  }

  return response
}

export const config = {
  matcher: [
    "/",
    "/(fr|en)/:path*",
    "/((?!api|_next|_vercel|ulysse|.*\\..*).*)",
  ],
}
