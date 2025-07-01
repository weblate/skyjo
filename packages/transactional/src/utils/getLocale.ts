import { type Locales } from "@skymo/shared/constants"
import {
  type TransactionalLocales,
  transactionalLocales,
} from "../constants.js"

/**
 * Check if the locale provided is supported for email. If not fallback on english.
 */
export function getLocale(locale: Locales): TransactionalLocales {
  return transactionalLocales.find((l) => l === locale) ?? "en"
}
