export const DISCORD_URL = "https://discord.gg/qKsaXebPyx"
export const WEBSITE_URL = "http://localhost:3000"
export const WEBSITE_LOGO_URL = `${WEBSITE_URL}/android-chrome-192x192.png`
export const SUPPORT_EMAIL = "support@skymo.online"

export const LOCALES = ["en", "fr"] as const
export type Locale = (typeof LOCALES)[number]
