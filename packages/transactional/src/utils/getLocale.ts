import { type TransactionalLocales, transactionalLocales } from "@/constants.js"
import { type Locales } from "@skymo/shared/constants"

export function getLocale(locale: Locales): TransactionalLocales {
  return transactionalLocales.find((l) => l === locale) ?? "en"
}
