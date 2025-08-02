import { PublicGameTag } from "@skymo/core"
import { PlusCircleIcon } from "lucide-react"
import { AnimatePresence } from "motion/react"
import { useTranslations } from "next-intl"
import { GameTag } from "@/components/GameTag/GameTag"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const allTags: PublicGameTag[] = [
  "classic",
  "column",
  "row",
  "short-game",
  "long-game",
] as const

interface TagsFilterProps {
  selectedTags: PublicGameTag[]
  onTagClick: (tag: PublicGameTag) => void
}

export const TagsFilter = ({ selectedTags, onTagClick }: TagsFilterProps) => {
  const t = useTranslations("pages.Search.tags")

  const filteredTags = allTags.filter((tag) => !selectedTags.includes(tag))

  return (
    <div className="flex flex-row items-center gap-1 mt-2">
      <p className="text-black dark:text-dark-font text-sm">{t("title")}</p>
      <div className="flex flex-row items-center gap-1">
        <AnimatePresence mode="popLayout">
          {selectedTags.map((tag) => (
            <GameTag
              key={tag}
              tag={tag}
              onClick={onTagClick}
              showXIconOnHover={true}
            />
          ))}
        </AnimatePresence>
      </div>
      <Popover>
        <PopoverTrigger asChild>
          <PlusCircleIcon className="w-4 h-4" />
        </PopoverTrigger>
        <PopoverContent className="w-fit">
          {filteredTags.length > 0 ? (
            <div className="flex flex-col items-start gap-3">
              {filteredTags.map((tag) => (
                <GameTag key={tag} tag={tag} onClick={onTagClick} />
              ))}
            </div>
          ) : (
            <p className="text-black dark:text-dark-font text-sm">
              {t("no-tags-available")}
            </p>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}
