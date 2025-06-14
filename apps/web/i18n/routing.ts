import { createNavigation } from "next-intl/navigation"
import { defineRouting } from "next-intl/routing"
import { Languages } from "next/dist/lib/metadata/types/alternative-urls-types"

const locales = [
  "bar",
  "br",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "fr",
  "frs",
  "gsw",
  "it",
  "nds",
  "nl",
  "pl",
  "sv",
  "ta",
  "uk",
] as const
export type Locales = (typeof locales)[number]

export const routing = defineRouting({
  locales,
  localePrefix: "as-needed",
  defaultLocale: "en",
  localeDetection: true,
})
export const generateAlternatesLanguages = (
  route?: string,
): Languages<string> => {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ""
  const path = route ? `/${route}` : ""

  const alternates: Record<string, string> = {}

  alternates[routing.defaultLocale] = `${baseUrl}${path}`

  routing.locales.forEach((locale) => {
    if (locale !== routing.defaultLocale) {
      alternates[locale] = `${baseUrl}/${locale}${path}`
    }
  })

  alternates["x-default"] = alternates[routing.defaultLocale]

  return alternates
}

export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing)
