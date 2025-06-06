import { tagVariants } from "@/components/GameTag/variants"
import { PublicGameTag } from "@skymo/core"
import { XIcon } from "lucide-react"
import { m } from "motion/react"
import { useTranslations } from "next-intl"

interface GameTagProps {
  tag: PublicGameTag
  showXIconOnHover?: boolean
  onClick?: (tag: PublicGameTag) => void
}
const GameTag = ({ tag, onClick, showXIconOnHover = false }: GameTagProps) => {
  const t = useTranslations("pages.Search.tags.tag")

  return (
    <m.span
      key={tag}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, transition: { duration: 0.2 } }}
      exit={{ opacity: 0, transition: { duration: 0.2 } }}
      className={tagVariants({ tag })}
      onClick={() => onClick?.(tag)}
    >
      {t(`${tag}`)}

      {showXIconOnHover && (
        <XIcon className="size-3 group-hover:block hidden relative left-1" />
      )}
    </m.span>
  )
}

export { GameTag }
