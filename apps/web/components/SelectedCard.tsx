import { Card } from "@/components/Card/Card"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"
import { AnimatePresence, m } from "motion/react"

type SelectedCardProps = {
  show: boolean
}

const SelectedCard = ({ show }: SelectedCardProps) => {
  const { game, isActionPending, turnStatus, lastClickedPile, lastTurnStatus } =
    useGame()

  // Show loading state for the selected card when we're replacing a card
  // but not when we're discarding the selected card
  const isSelectedCardLoading =
    isActionPending &&
    turnStatus.isThrowOrReplace &&
    lastClickedPile !== "discard" // Don't show loading when discarding

  return (
    <AnimatePresence>
      {game.selectedCardValue !== null && show && (
        <m.div
          className={cn(
            "absolute top-0 z-10",
            lastTurnStatus.isPickFromDrawPile ? "left-0" : "right-0",
          )}
          initial={
            lastTurnStatus.isPickFromDrawPile
              ? { rotateY: 180 }
              : { rotateY: 0 }
          }
          animate={{
            rotateY: 0,
            transformStyle: "preserve-3d",
            transition: {
              duration: lastTurnStatus.isPickFromDrawPile ? 0.175 : 0.1,
            },
            rotate: lastTurnStatus.isPickFromDrawPile ? "-10deg" : "10deg",
            scale: 1.2,
          }}
          // exit={exit}
        >
          <Card value="back" size="normal" disabled />
          <m.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
              transition: {
                duration: lastTurnStatus.isPickFromDrawPile ? 0.175 : 0,
                delay: lastTurnStatus.isPickFromDrawPile ? 0.075 : 0,
              },
            }}
            className="absolute top-0 left-0 w-full h-full"
          >
            <Card
              value={game.selectedCardValue}
              size="normal"
              disabled
              loading={isSelectedCardLoading}
            />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export default SelectedCard
