"use client"

import { Constants as CoreConstants } from "@skymo/core"
import { TimerDisplayMode } from "@skymo/shared/constants"
import { cva } from "class-variance-authority"
import { ClassValue } from "clsx"
import dayjs from "dayjs"
import { AnimatePresence, m } from "motion/react"
import { useEffect, useRef, useState } from "react"
import { useGame } from "@/contexts/GameContext"
import { useSettings } from "@/contexts/SettingsContext"
import { cn } from "@/lib/utils"

const turnTimerTextVariants = cva("text-sm", {
  variants: {
    timeLeft: {
      danger: "text-red-500 dark:text-red-400",
      normal: "text-black dark:text-dark-font",
    },
  },
})

interface TurnTimerProps {
  className?: ClassValue
  turnStartTime: number | null
}
const TurnTimer = ({ className, turnStartTime }: TurnTimerProps) => {
  const { game, gameStatus } = useGame()
  const {
    settings: { timerDisplayMode },
  } = useSettings()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const currentPlayer = game.players[game.turn]
  const turnTime =
    currentPlayer?.timeout ?? CoreConstants.TURN_TIMEOUT.CONNECTED

  const [timeLeft, setTimeLeft] = useState<number>(turnTime)

  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)

    if (timerDisplayMode === TimerDisplayMode.NEVER) return

    if (!turnStartTime) return

    const now = dayjs()
    const elapsedTime = now.diff(turnStartTime, "ms")
    setTimeLeft(turnTime - elapsedTime)

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        const newTime = Math.max(0, prev - 1000)
        if (newTime <= 0) {
          clearInterval(intervalRef.current!)
        }
        return newTime
      })
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [turnStartTime, turnTime, timerDisplayMode])

  const formattedTime = dayjs(timeLeft).format("mm:ss")
  const timeLeftVariant = timeLeft <= 10000 ? "danger" : "normal"

  const shouldShowTimer = () => {
    if (timerDisplayMode === TimerDisplayMode.NEVER || !gameStatus.isPlaying) {
      return false
    }

    // For regular turns, need turnStartTime
    if (!turnStartTime) return false

    if (timerDisplayMode === TimerDisplayMode.ALWAYS) return true

    // Smart mode logic
    const halfTime = turnTime / 2
    const timeElapsed = turnTime - timeLeft

    // If the timer is last 15 seconds, show it
    const isLastFifteenSeconds = timeLeft <= 15000

    // If the timer is after half time to half time + 5 seconds, show it
    const isAfterHalfTime =
      timeElapsed >= halfTime && timeElapsed <= halfTime + 10000

    return isLastFifteenSeconds || isAfterHalfTime
  }

  return (
    <AnimatePresence>
      {shouldShowTimer() && (
        <m.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            turnTimerTextVariants({ timeLeft: timeLeftVariant }),
            className,
          )}
        >
          {timeLeft > 0 ? formattedTime : "00:00"}
        </m.span>
      )}
    </AnimatePresence>
  )
}

export { TurnTimer }
