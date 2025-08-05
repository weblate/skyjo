import { hreflangMapping, locales } from "@skymo/shared/constants"
import { Languages } from "next/dist/lib/metadata/types/alternative-urls-types"
import { createNavigation } from "next-intl/navigation"
import { defineRouting } from "next-intl/routing"

export const routing = defineRouting({
  locales,
  localePrefix: "as-needed",
  defaultLocale: "en",
  localeDetection: true,
})

/**
 * Generates hreflang alternates for SEO purposes.
 *
 * Some locales map to the same ISO language code (e.g., bar, nds, gsw → de).
 * When duplicates occur, we keep the first occurrence to avoid conflicts.
 * This ensures each hreflang code appears only once in the alternates object.
 */
export const generateAlternatesLanguages = (
  route?: string,
): Languages<string> => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const path = route ? `/${route}` : ""

  const alternates: Record<string, string> = {}

  // Add default locale (without prefix)
  const defaultHreflang = hreflangMapping[routing.defaultLocale]
  alternates[defaultHreflang] = `${baseUrl}${path}`

  // Add other locales (with prefix)
  routing.locales.forEach((locale) => {
    if (locale !== routing.defaultLocale) {
      const hreflangCode = hreflangMapping[locale]

      // Only add if this hreflang code hasn't been added yet
      // This prevents duplicates when multiple locales map to the same ISO code
      if (!alternates[hreflangCode]) {
        alternates[hreflangCode] = `${baseUrl}/${locale}${path}`
      }
    }
  })

  alternates["x-default"] = alternates[defaultHreflang]

  return alternates
}

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing)
