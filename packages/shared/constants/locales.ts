export const locales = ["en", "es", "fr", "br", "ta"] as const
export type Locales = (typeof locales)[number]
