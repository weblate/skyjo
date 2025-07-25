import createNextIntlMiddleware from "next-intl/middleware"
import { routing } from "@/i18n/routing"

export default createNextIntlMiddleware(routing)

export const config = {
  matcher: ["/", "/(fr|en)/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
}
