export const locales = [
  "br",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "fr",
  "it",
  "nl",
  "pl",
  "sv",
  "ta",
  "uk",
  "bar",
  "gsw",
  "frs",
  "nds",
  "fi",
  "hu",
] as const
export type Locales = (typeof locales)[number]

/**
 * Maps internal locale codes to valid ISO 639-1 language codes for hreflang attributes.
 *
 * Some of our internal locale codes are not valid ISO 639-1 language codes (like "bar" for Bavarian
 * or "gsw" for Swiss German). When generating hreflang attributes for SEO purposes, we need to
 * use valid ISO language codes that search engines can understand.
 *
 * This mapping ensures that:
 * 1. Search engines can properly index our localized pages
 * 2. Browsers can suggest the correct language to users
 * 3. We maintain compatibility with web standards
 *
 * For locales that are already valid ISO 639-1 codes, we map them to themselves.
 * For non-standard codes, we map them to the closest valid ISO language code.
 */
export const hreflangMapping: Record<Locales, string> = {
  bar: "de",
  br: "br",
  cs: "cs",
  da: "da",
  de: "de",
  el: "el",
  en: "en",
  es: "es",
  et: "et",
  fr: "fr",
  frs: "de",
  gsw: "de-CH",
  it: "it",
  nds: "de",
  nl: "nl",
  pl: "pl",
  sv: "sv",
  ta: "ta",
  uk: "uk",
  fi: "fi",
  hu: "hu",
}
