import type { Locale } from "./constants.js"

export interface DefaultProps<T> {
  locale: Locale
  content: T
}
