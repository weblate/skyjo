import type { TransactionalLocales } from "./constants.ts"

export interface DefaultProps<T = undefined> {
  locale: TransactionalLocales
  content: T
}
