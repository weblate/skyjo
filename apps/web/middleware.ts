import { routing } from "@/i18n/routing"
import createNextIntlMiddleware from "next-intl/middleware"
import { NextRequest } from "next/server"

const nextIntlMiddleware = createNextIntlMiddleware(routing)

export default async function middleware(request: NextRequest) {
  // Only handle internationalization
  // Authentication is now handled by the DAL in layouts and pages
  const response = nextIntlMiddleware(request)

  // Add the pathname to the headers so it can be accessed in server components
  response.headers.set("x-pathname", request.nextUrl.pathname)

  return response
}

export const config = {
  matcher: ["/", "/(fr|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
}
