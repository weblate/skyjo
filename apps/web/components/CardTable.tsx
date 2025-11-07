import { CardToJson } from "@skymo/core"
import { GameBoardSize } from "@skymo/shared/constants"
import { cva } from "class-variance-authority"
import { AnimatePresence, m } from "motion/react"
import { useCallback, useEffect, useState } from "react"
import { GameCard } from "@/components/Card/GameCard"
import { useGame } from "@/contexts/GameContext"
import { isCurrentUserTurn, isRoundRevealCards } from "@/lib/game"
import { cn } from "@/lib/utils"

const cardTableVariants = cva("inline-grid grid-flow-col duration-100 w-fit", {
  variants: {
    size: {
      small: "gap-1.5 mdh:gap-2",
      normal: "gap-1 mdh:gap-1.5 xlh:gap-2",
      big: "gap-2 mdh:gap-4",
    },
  },
})

const getGridTemplate = (cards: CardToJson[][]): React.CSSProperties => {
  const cols = cards?.length ?? 0
  const rows = cards?.[0]?.length ?? 0

  return {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, 1fr)`,
  }
}

interface CardTableProps {
  cards: CardToJson[][]
  cardDisabled?: boolean
  showSelectionAnimation?: boolean
  size?: GameBoardSize
}

const CardTable = ({
  cards,
  cardDisabled = false,
  showSelectionAnimation = false,
  size = GameBoardSize.NORMAL,
}: CardTableProps) => {
  const { game, player, nbConnectedPlayers, actions, roundPhase, turnStatus } =
    useGame()

  const [style, setStyle] = useState<React.CSSProperties>(
    getGridTemplate(cards),
  )

  const canRevealCards = !player.hasRevealedCardCount

  const canReplaceCard =
    turnStatus.isThrowOrReplace || turnStatus.isReplaceACard

  const canTurnCard = !roundPhase.isRevealCards && turnStatus.isTurnACard

  const handleCardClick = (column: number, row: number) => {
    const isUserTurn = isCurrentUserTurn(game, player)
    const isCardVisible = cards[column][row].isVisible

    if (canRevealCards) actions.playRevealCard(column, row)
    else if (isUserTurn && canReplaceCard) actions.replaceCard(column, row)
    else if (isUserTurn && turnStatus.isTurnACard && !isCardVisible)
      actions.turnCard(column, row)
  }

  // Update grid immediately during reveal phase, or wait for exit animations to complete
  const handleAnimationComplete = useCallback(() => {
    setStyle(getGridTemplate(cards))
  }, [cards])

  useEffect(() => {
    if (isRoundRevealCards(game.roundPhase)) handleAnimationComplete()
  }, [game.roundPhase, cards, handleAnimationComplete])

  return (
    <m.div
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0.9 }}
      transition={{ duration: 0 }}
      className={cn(cardTableVariants({ size }))}
      style={style}
    >
      <AnimatePresence onExitComplete={handleAnimationComplete}>
        {cards.map((column, columnIndex) => {
          return column.map((card, rowIndex) => {
            const canBeSelected =
              ((canRevealCards || canTurnCard) && !card.isVisible) ||
              canReplaceCard

            const shouldShowSelectionAnimation =
              showSelectionAnimation && canBeSelected

            return (
              <GameCard
                key={card.id}
                card={card}
                onClick={() => handleCardClick(columnIndex, rowIndex)}
                className={
                  shouldShowSelectionAnimation ? "animate-small-scale" : ""
                }
                size={size}
                disabled={cardDisabled || !canBeSelected}
                showFlipAnimation={canRevealCards || canTurnCard}
                showExitAnimation={
                  roundPhase.isRevealCards ||
                  roundPhase.isMain ||
                  roundPhase.isLastLap
                }
                playerCount={nbConnectedPlayers}
              />
            )
          })
        })}
      </AnimatePresence>
    </m.div>
  )
}

export { CardTable }
