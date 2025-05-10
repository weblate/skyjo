import type { Locale } from "contants.js"

export interface DefaultProps<T> {
  locale: Locale
  content: T
}
