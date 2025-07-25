import { NextRequest } from "next/server"
import createNextIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

const nextIntlMiddleware = createNextIntlMiddleware(routing)

export default function middleware(request: NextRequest) {
  return nextIntlMiddleware(request)
}

export const config = {
  matcher: ["/", "/(fr|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
}
