import { Card } from "@/components/Card"
import { useSkyjo } from "@/contexts/SkyjoContext"
import { cn } from "@/lib/utils"
import { AnimatePresence, m } from "framer-motion"

type SelectedCardProps = {
  show: boolean
}

const SelectedCard = ({ show }: SelectedCardProps) => {
  const { game } = useSkyjo()

  const pickFromDrawPile = game.lastMove === "pickFromDrawPile"

  // let exit: TargetAndTransition = pickFromDrawPile
  //   ? {
  //       translateX: 92,
  //       rotate: "0deg",
  //       scale: 1,
  //       transition: {
  //         duration: 0.1,
  //       }
  //     }
  //   : {
  //     }

  return (
    <AnimatePresence>
      {game.selectedCard && show && (
        <m.div
          className={cn(
            "absolute top-0 z-10",
            pickFromDrawPile ? "left-0" : "right-0",
          )}
          initial={pickFromDrawPile ? { rotateY: 180 } : { rotateY: 0 }}
          animate={{
            rotateY: 0,
            transformStyle: "preserve-3d",
            transition: {
              duration: pickFromDrawPile ? 0.175 : 0.1,
            },
            rotate: pickFromDrawPile ? "-10deg" : "10deg",
            scale: 1.2,
          }}
          // exit={exit}
        >
          <Card
            card={{
              value: undefined,
              isVisible: false,
            }}
            size="normal"
            disabled
            flipAnimation={false}
          />
          <m.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
              transition: {
                duration: pickFromDrawPile ? 0.175 : 0,
                delay: pickFromDrawPile ? 0.075 : 0,
              },
            }}
          >
            <Card
              card={game.selectedCard}
              className="absolute top-0 left-0 w-full h-full"
              size="normal"
              disabled
              flipAnimation={false}
            />
          </m.div>
        </m.div>
      )}
    </AnimatePresence>
  )
}

export default SelectedCard
