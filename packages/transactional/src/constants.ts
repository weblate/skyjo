import { locales as sharedLocales } from "@skymo/shared/constants"

export const DISCORD_URL = "https://discord.gg/qKsaXebPyx"
export const WEBSITE_URL = "http://localhost:3000"
export const WEBSITE_LOGO_URL = `${WEBSITE_URL}/android-chrome-192x192.png`
export const SUPPORT_EMAIL = "support@skymo.online"

// Locales supported by transactional emails
export const transactionalLocales = ["en", "fr"] as const
export type TransactionalLocales = (typeof transactionalLocales)[number]

// Locales from shared package
export const locales = sharedLocales
export type Locales = (typeof locales)[number]
