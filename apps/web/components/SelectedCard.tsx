import { AnimatePresence, m } from "motion/react"
import { memo, useEffect, useMemo, useState } from "react"
import { GameCard } from "@/components/Card/GameCard"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"

interface SelectedCardProps {
  show: boolean
}
const SelectedCard = memo(({ show }: SelectedCardProps) => {
  const { game, lastTurnStatus } = useGame()
  const [isCardVisible, setIsCardVisible] = useState(false)

  const cardData = useMemo(() => {
    const selectedCardValue = game.selectedCardValue
    const isPickFromDrawPile = lastTurnStatus.isPickFromDrawPile

    return {
      selectedCardValue,
      isPickFromDrawPile,
      shouldShow: selectedCardValue !== null && show,
    }
  }, [game.selectedCardValue, lastTurnStatus.isPickFromDrawPile, show])

  useEffect(() => {
    if (cardData.shouldShow) {
      // Start with card face-down
      setIsCardVisible(false)
      // Then flip to face-up after a brief delay
      const timer = setTimeout(
        () => {
          setIsCardVisible(true)
        },
        cardData.isPickFromDrawPile ? 50 : 0,
      )

      return () => clearTimeout(timer)
    } else {
      setIsCardVisible(false)
    }
  }, [cardData.shouldShow, cardData.isPickFromDrawPile])

  if (!cardData.shouldShow) return null

  return (
    <AnimatePresence>
      <m.div
        className={cn(
          "absolute top-0 z-10",
          cardData.isPickFromDrawPile ? "left-0" : "right-0",
        )}
        initial={{
          scale: 1,
        }}
        animate={{
          scale: 1.2,
          rotate: cardData.isPickFromDrawPile ? -10 : 10,
        }}
        transition={{
          duration: cardData.isPickFromDrawPile ? 0.175 : 0.1,
          ease: "easeOut",
        }}
      >
        <GameCard
          card={{
            id: "selected-card",
            value: cardData.selectedCardValue!,
            isVisible: isCardVisible,
          }}
          size="normal"
          disabled
          showInitialAnimation={false}
          showFlipAnimation={cardData.isPickFromDrawPile}
          showExitAnimation={false}
        />
      </m.div>
    </AnimatePresence>
  )
})
SelectedCard.displayName = "SelectedCard"

export default SelectedCard
