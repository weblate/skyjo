import { locales as sharedLocales } from "@skymo/shared/constants"

export const DISCORD_URL = process.env.DISCORD_URL
export const WEBSITE_URL = process.env.FRONT_URL
export const WEBSITE_LOGO_URL = `${WEBSITE_URL}/android-chrome-192x192.png`
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL

// Locales supported by transactional emails
export const transactionalLocales = ["en", "fr"] as const
export type TransactionalLocales = (typeof transactionalLocales)[number]

// Locales from shared package
export const locales = sharedLocales
export type Locales = (typeof locales)[number]
