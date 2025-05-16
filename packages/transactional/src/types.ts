import type { TransactionalLocales } from "./constants.js"

export interface DefaultProps<T> {
  locale: TransactionalLocales
  content: T
}
