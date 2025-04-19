"use client"

import { Card } from "@/components/Card/Card"
import SelectedCard from "@/components/SelectedCard"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"

interface DiscardPileProps {
  isPlayerTurn: boolean
}
const DiscardPile = ({ isPlayerTurn }: DiscardPileProps) => {
  const {
    game,
    actions,
    isActionPending,
    lastClickedPile,
    pendingAction,
    turnStatus,
  } = useGame()
  const t = useTranslations("components.DiscardPile")

  const onClick = () => {
    if (
      isPlayerTurn &&
      game.lastDiscardCardValue !== undefined &&
      !isActionPending &&
      turnStatus.isChooseAPile
    ) {
      actions.pickCardFromPile("discard")
    }
  }

  const onDiscard = () => {
    if (isPlayerTurn && !isActionPending) actions.discardSelectedCard()
  }

  // Check if discard is loading - either when lastClickedPile is "discard"
  // OR when the specific action is discarding a selected card
  const isDiscardLoading =
    isActionPending &&
    (lastClickedPile === "discard" ||
      pendingAction === "play:discard-selected-card")

  if (isPlayerTurn && turnStatus.isThrowOrReplace) {
    const shouldAnimate = !isActionPending

    return (
      <Card
        value="discard"
        onClick={onDiscard}
        title={t("throw")}
        className={cn("translate-y-1", shouldAnimate ? "animate-scale" : "")}
        disabled={false}
        loading={isDiscardLoading}
      />
    )
  }

  const card = {
    id: "discard",
    value: game.lastDiscardCardValue ?? -99,
    isVisible: game.lastDiscardCardValue !== undefined,
  }

  const canDiscard = isPlayerTurn && turnStatus.isChooseAPile

  const shouldAnimate = canDiscard && !isActionPending

  return (
    <div className="relative">
      <SelectedCard show={turnStatus.isReplaceACard} />
      <Card
        value={card.value}
        onClick={onClick}
        title={t("title")}
        className={cn(
          card.value === -99 ? "translate-y-1" : "translate-y-[2.5px]",
          shouldAnimate ? "animate-scale" : "",
        )}
        disabled={!canDiscard}
        loading={isDiscardLoading}
      />
    </div>
  )
}

export default DiscardPile
