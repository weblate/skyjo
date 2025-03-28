import ScoreTable from "@/components/ScoreTable"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useGame } from "@/contexts/GameContext"
import { DialogDescription } from "@radix-ui/react-dialog"
import { useTranslations } from "next-intl"
import { useEffect, useState } from "react"

const EndRoundDialog = () => {
  const { game, roundPhase, gameStatus } = useGame()
  const t = useTranslations("components.EndRoundDialog")

  const [dialogOpen, setDialogOpen] = useState(false)

  const shouldBeOpen = gameStatus.isPlaying && roundPhase.isOver

  useEffect(() => {
    setTimeout(() => {
      setDialogOpen(shouldBeOpen)
    }, 1400)
  }, [shouldBeOpen])

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center">{t("title")}</DialogTitle>
          <DialogDescription className="mt-2 text-center">
            {t("description")}
          </DialogDescription>
        </DialogHeader>
        <ScoreTable players={game.players} scrollToEnd />
      </DialogContent>
    </Dialog>
  )
}

export default EndRoundDialog
