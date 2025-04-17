import { routing } from "@/i18n/routing"
import deepmerge from "deepmerge"
import { hasLocale } from "next-intl"
import { getRequestConfig } from "next-intl/server"
export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale

  const localeMessages = (await import(`../locales/${locale}.json`)).default
  const defaultMessages = (await import(`../locales/en.json`)).default
  const messages = deepmerge(defaultMessages, localeMessages)

  return {
    locale,
    messages,
  }
})
