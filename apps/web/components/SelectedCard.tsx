import { AnimatePresence, HTMLMotionProps, m } from "motion/react"
import { memo, useMemo } from "react"
import { Card } from "@/components/Card/Card"
import { useGame } from "@/contexts/GameContext"
import { cn } from "@/lib/utils"

interface SelectedCardProps {
  show: boolean
}
const SelectedCard = memo(({ show }: SelectedCardProps) => {
  const { game, lastTurnStatus } = useGame()

  const cardData = useMemo(() => {
    const selectedCardValue = game.selectedCardValue
    const isPickFromDrawPile = lastTurnStatus.isPickFromDrawPile

    return {
      selectedCardValue,
      isPickFromDrawPile,
      shouldShow: selectedCardValue !== null && show,
    }
  }, [game.selectedCardValue, lastTurnStatus.isPickFromDrawPile, show])

  const animationConfig = useMemo<HTMLMotionProps<"div">>(() => {
    const { isPickFromDrawPile } = cardData

    return {
      className: cn(
        "absolute top-0 z-10",
        isPickFromDrawPile ? "left-0" : "right-0",
      ),
      initial: {
        scale: 1,
      },
      animate: {
        rotateY: 0,
        scale: 1.2,
        rotate: isPickFromDrawPile ? -10 : 10,
      },
      transition: {
        duration: isPickFromDrawPile ? 0.175 : 0.1,
        ease: "easeOut",
      },
    }
  }, [cardData.isPickFromDrawPile])

  const cardRevealAnimation = useMemo<HTMLMotionProps<"div">>(() => {
    const { isPickFromDrawPile } = cardData

    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      transition: {
        duration: isPickFromDrawPile ? 0.175 : 0,
        delay: isPickFromDrawPile ? 0.075 : 0,
        ease: "easeOut",
      },
    }
  }, [cardData.isPickFromDrawPile])

  if (!cardData.shouldShow) return null

  return (
    <AnimatePresence>
      <m.div
        className={animationConfig.className}
        initial={animationConfig.initial}
        animate={animationConfig.animate}
        transition={animationConfig.transition}
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        <Card value="back" size="normal" disabled />
        <m.div
          initial={cardRevealAnimation.initial}
          animate={cardRevealAnimation.animate}
          transition={cardRevealAnimation.transition}
          className="absolute top-0 left-0 w-full h-full"
          style={{
            willChange: "opacity",
          }}
        >
          <Card
            value={cardData.selectedCardValue ?? undefined}
            size="normal"
            disabled
          />
        </m.div>
      </m.div>
    </AnimatePresence>
  )
})
SelectedCard.displayName = "SelectedCard"

export default SelectedCard
