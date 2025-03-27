"use client"

import { Card } from "@/components/Card"
import SelectedCard from "@/components/SelectedCard"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"
import { Constants as CoreConstants } from "@skymo/core"
import { useTranslations } from "next-intl"

const DRAW_CARD = {
  id: "draw",
  value: undefined,
  isVisible: false,
}

type DrawPileProps = {
  isPlayerTurn: boolean
}

const DrawPile = ({ isPlayerTurn }: DrawPileProps) => {
  const { game, actions, isActionPending, lastClickedPile } = useGame()
  const t = useTranslations("components.DrawPile")

  const onClick = () => {
    if (isPlayerTurn && !isActionPending) {
      actions.pickCardFromPile("draw")
    }
  }

  // Determine if this draw pile should have the selection animation
  const shouldAnimate =
    isPlayerTurn &&
    game.turnStatus === CoreConstants.TURN_STATUS.CHOOSE_A_PILE &&
    !isActionPending

  // Determine if this draw pile should pulse when action is pendings
  const isDrawLoading = isActionPending && lastClickedPile === "draw"

  return (
    <div className="relative">
      <SelectedCard
        show={game.turnStatus === CoreConstants.TURN_STATUS.THROW_OR_REPLACE}
      />
      <Card
        card={DRAW_CARD}
        onClick={onClick}
        title={t("title")}
        className={cn(
          "!shadow-[3px_3px_0px_0px_rgba(0,0,0)] !mdh:md:shadow-[4px_4px_0px_0px_rgba(0,0,0)]",
          shouldAnimate ? "animate-scale" : "",
        )}
        disabled={
          !(
            isPlayerTurn &&
            game.turnStatus === CoreConstants.TURN_STATUS.CHOOSE_A_PILE
          )
        }
        loading={isDrawLoading}
        flipAnimation={false}
      />
    </div>
  )
}

export default DrawPile
