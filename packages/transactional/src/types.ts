import type { Locales } from "./constants.js"

export interface DefaultProps<T> {
  locale: Locales
  content: T
}
