import { transactionalLocales } from "@/constants.js"
import {} from "@skymo/shared/constants"
export function getLocale(locale) {
  return transactionalLocales.find((l) => l === locale) ?? "en"
}
//# sourceMappingURL=getLocale.js.map
