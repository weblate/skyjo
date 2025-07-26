import { MetadataRoute } from "next"
import { routing } from "@/i18n/routing"

const disallowRoutes = ["game", "auth/callback", "u"]

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const disallow = disallowRoutes.map((route) =>
    routing.locales.map((locale) =>
      locale === routing.defaultLocale ? `/${route}/` : `/${locale}/${route}/`,
    ),
  )

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: disallow.flat(),
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
