"use client"

import { useTranslations } from "next-intl"
import { Card } from "@/components/Card/Card"
import SelectedCard from "@/components/SelectedCard"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"

interface DrawPileProps {
  isPlayerTurn: boolean
}
const DrawPile = ({ isPlayerTurn }: DrawPileProps) => {
  const { actions, turnStatus } = useGame()
  const t = useTranslations("components.DrawPile")

  const onClick = () => {
    if (isPlayerTurn) {
      actions.pickCardFromPile("draw")
    }
  }

  // Determine if this draw pile should have the selection animation
  const shouldAnimate = isPlayerTurn && turnStatus.isChooseAPile

  return (
    <div className="relative">
      <SelectedCard show={turnStatus.isThrowOrReplace} />
      <Card
        value="back"
        onClick={onClick}
        title={t("title")}
        className={cn(
          "shadow-[3px_3px_0px_0px_rgba(0,0,0)]! !mdh:md:shadow-[4px_4px_0px_0px_rgba(0,0,0)]",
          shouldAnimate ? "animate-scale" : "",
        )}
        disabled={!isPlayerTurn || !turnStatus.isChooseAPile}
      />
    </div>
  )
}

export default DrawPile
