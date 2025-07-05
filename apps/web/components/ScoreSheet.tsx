import { PlayerToJson } from "@skymo/core"
import { useTranslations } from "next-intl"
import { useState } from "react"
import ScoreTable from "@/components/ScoreTable"

interface ScoreSheetProps {
  players: PlayerToJson[]
}
const ScoreSheet = ({ players }: ScoreSheetProps) => {
  const t = useTranslations("components.ScoreSheet")

  const [open, setOpen] = useState(false)

  return (
    <div className="absolute right-8 bottom-0 z-10 flex items-center justify-end">
      <div
        className={`w-fit h-fit bg-white dark:bg-dark-input shadow-sm border rounded-t-lg boder-slate-600 flex flex-col items-center duration-300 transition-transform ease-in-out ${
          open ? "translate-y-0" : "-translate-y-[calc(-100%+2.75rem)]"
        }`}
      >
        <button
          className="text-center text-black dark:text-dark-font font-semibold w-full px-4 py-2 border-b"
          onClick={() => setOpen(!open)}
        >
          {t("see-scores")}
        </button>
        <ScoreTable players={players} />
      </div>
    </div>
  )
}

export default ScoreSheet
