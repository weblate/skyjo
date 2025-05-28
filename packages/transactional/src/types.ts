import type { TransactionalLocales } from "./constants.ts"

export interface DefaultProps<T> {
  locale: TransactionalLocales
  content: T
}
