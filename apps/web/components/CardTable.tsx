import { GameCard } from "@/components/Card/GameCard"
import { useGame } from "@/contexts/GameContext"
import { GameBoardSize } from "@/contexts/SettingsContext"
import { hasRevealedCardCount, isCurrentUserTurn } from "@/lib/game"
import { cn } from "@/lib/utils"
import { CardToJson } from "@skymo/core"
import { cva } from "class-variance-authority"
import { AnimatePresence, m } from "motion/react"
import { useEffect, useState } from "react"

const cardTableVariants = cva("inline-grid grid-flow-col duration-100 w-fit", {
  variants: {
    size: {
      normal: "gap-1 smh:gap-2",
      big: "gap-2 smh:gap-4",
    },
  },
})

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
  const {
    game,
    player,
    actions,
    gameStatus,
    roundPhase,
    turnStatus,
    lastTurnStatus,
  } = useGame()
  const numberOfRows = cards?.[0]?.length
  const [numberOfRowsForClass, setNumberOfRowsForClass] = useState<number>(
    game.settings.cardPerRow,
  )

  const canRevealCards =
    gameStatus.isPlaying &&
    roundPhase.isRevealCards &&
    !hasRevealedCardCount(player, game.settings.initialTurnedCount)

  const canReplaceCard =
    turnStatus.isThrowOrReplace || turnStatus.isReplaceACard

  const canTurnCard = turnStatus.isTurnACard

  const handleCardClick = (column: number, row: number) => {
    const isUserTurn = isCurrentUserTurn(game, player)
    const isCardVisible = cards[column][row].isVisible

    if (canRevealCards) actions.playRevealCard(column, row)
    else if (isUserTurn && canReplaceCard) actions.replaceCard(column, row)
    else if (isUserTurn && turnStatus.isTurnACard && !isCardVisible)
      actions.turnCard(column, row)
  }

  // wait 2 seconds to set the number of rows (it's the time it takes for the animation to finish)
  useEffect(() => {
    if (numberOfRows === game.settings.cardPerRow)
      setNumberOfRowsForClass(game.settings.cardPerRow)
    setTimeout(() => {
      setNumberOfRowsForClass(numberOfRows)
    }, 1900)
  }, [numberOfRows, game.settings.cardPerRow])

  return (
    <m.div
      key={numberOfRowsForClass}
      initial={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0.9 }}
      transition={{ duration: 0.3 }}
      className={cn(
        cardTableVariants({ size }),
        numberOfRowsForClass
          ? `grid-rows-${numberOfRowsForClass}`
          : "grid-rows-3",
      )}
    >
      <AnimatePresence>
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
                showFlipAnimation={lastTurnStatus.isTurn}
                showExitAnimation={roundPhase.isMain || roundPhase.isLastLap}
              />
            )
          })
        })}
      </AnimatePresence>
    </m.div>
  )
}

export { CardTable }
