import { routing } from "@/i18n/routing"
import { locales } from "@skymo/shared/constants"
import createNextIntlMiddleware from "next-intl/middleware"
import { NextRequest } from "next/server"
import { authMiddleware } from "./authMiddleware"

// Define public pages - paths relative to root, without locale prefixes
// Add any other pages that should not be protected by auth
const publicPages = [
  "/",
  "/signup",
  "/login",
  "/search",
  "/create",
  "/rules",
  "/privacy-policy",
  "/auth/callback",
]

// Special handling for paths that start with these prefixes (these will be public)
const publicPrefixes = ["/game", "/reset-password", "/revert-email"]

const publicPathnameRegex = RegExp(
  `^(/(${locales.join("|")}))?(${publicPages
    .flatMap((p) => (p === "/" ? ["", "/"] : p))
    .join(
      "|",
    )}|${publicPrefixes.map((prefix) => `${prefix}($|/.*)`).join("|")})/?$`,
  "i",
)

const nextIntlMiddleware = createNextIntlMiddleware(routing)

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublicPage = publicPathnameRegex.test(pathname)

  if (!isPublicPage) {
    // For protected pages, first apply authMiddleware
    const authResponse = await authMiddleware(request)

    // If authMiddleware decided to redirect (e.g., to login), return that response directly.
    // authMiddleware should handle locale in its redirect URL.
    if (
      authResponse.status === 307 || // Temporary Redirect
      authResponse.status === 302 || // Found (Permanent Redirect often used)
      authResponse.headers.get("Location") // Check for Location header as a general redirect indicator
    ) {
      return authResponse
    }

    return nextIntlMiddleware(request)
  }

  return nextIntlMiddleware(request)
}

export const config = {
  matcher: ["/", "/(fr|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
}
