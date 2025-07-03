import { PublicGameTag } from "@skymo/core"
import { Locales } from "@skymo/shared/constants"
import { getTranslations } from "next-intl/server"
import { tagVariants } from "./variants"

interface GameTagProps {
  tag: PublicGameTag
  locale: Locales
}
const GameTagServer = async ({ tag, locale }: GameTagProps) => {
  const t = await getTranslations({
    locale,
    namespace: "pages.Search.tags.tag",
  })

  return (
    <span key={tag} className={tagVariants({ tag, clickable: false })}>
      {t(`${tag}`)}
    </span>
  )
}

export { GameTagServer }
