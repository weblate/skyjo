import { Card } from "@/components/Card/Card"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"
import { AnimatePresence, m } from "motion/react"

interface SelectedCardProps {
  show: boolean
}
const SelectedCard = ({ show }: SelectedCardProps) => {
  const { game, lastTurnStatus } = useGame()

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
            <Card value={game.selectedCardValue} size="normal" disabled />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export default SelectedCard
