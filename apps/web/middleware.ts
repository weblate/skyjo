import { redirect } from "next/navigation"
import { NextRequest } from "next/server"
import createNextIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"
import { verifySession } from "@/lib/dal"

const nextIntlMiddleware = createNextIntlMiddleware(routing)

export default async function middleware(request: NextRequest) {
  // Only handle internationalization
  // Authentication is now handled by the DAL in layouts and pages
  const response = nextIntlMiddleware(request)

  // Add the pathname to the headers so it can be accessed in server components
  const pathname = request.nextUrl.pathname

  const session = await verifySession()
  if (session) {
    if (!session.emailVerified && !pathname.includes("/verify")) {
      redirect("/verify")
    }

    if (
      session.emailVerified &&
      !session.onboardingCompleted &&
      !pathname.includes("/onboard")
    ) {
      redirect("/onboard")
    }
  }

  return response
}

export const config = {
  matcher: ["/", "/(fr|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
}
