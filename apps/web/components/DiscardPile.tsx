"use client"

import { useTranslations } from "next-intl"
import { Card } from "@/components/Card/Card"
import SelectedCard from "@/components/SelectedCard"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"

interface DiscardPileProps {
  isPlayerTurn: boolean
}
const DiscardPile = ({ isPlayerTurn }: DiscardPileProps) => {
  const { game, actions, turnStatus } = useGame()
  const t = useTranslations("components.DiscardPile")

  const onClick = () => {
    if (
      isPlayerTurn &&
      game.lastDiscardCardValue !== undefined &&
      turnStatus.isChooseAPile
    ) {
      actions.pickCardFromPile("discard")
    }
  }

  const onDiscard = () => {
    if (isPlayerTurn) actions.discardSelectedCard()
  }

  if (isPlayerTurn && turnStatus.isThrowOrReplace) {
    return (
      <Card
        value="discard"
        onClick={onDiscard}
        title={t("throw")}
        className={cn("translate-y-1 animate-scale")}
        disabled={false}
      />
    )
  }

  const card = {
    id: "discard",
    value: game.lastDiscardCardValue ?? -99,
    isVisible: game.lastDiscardCardValue !== undefined,
  }

  const canDiscard = isPlayerTurn && turnStatus.isChooseAPile

  return (
    <div className="relative">
      <SelectedCard show={turnStatus.isReplaceACard} />
      <Card
        value={card.value}
        onClick={onClick}
        title={t("title")}
        className={cn(
          card.value === -99 ? "translate-y-1" : "translate-y-[2.5px]",
          canDiscard && "animate-scale",
        )}
        disabled={!canDiscard}
      />
    </div>
  )
}

export default DiscardPile
