"use client"

import { useSkyjo } from "@/contexts/SkyjoContext"
import { cn } from "@/lib/utils"
import { Constants as CoreConstants } from "@skyjo/core"
import { cva } from "class-variance-authority"
import dayjs from "dayjs"
import { useEffect, useState } from "react"

const turnTimerTextVariants = cva("text-sm", {
  variants: {
    timeLeft: {
      danger: "text-red-500 dark:text-red-400",
      warning: "text-yellow-500 dark:text-yellow-400",
      normal: "text-black dark:text-dark-font",
    },
  },
})

type TurnTimerProps = {
  className?: string
  turnStartTime: Date | null
}
const TurnTimer = ({ className, turnStartTime }: TurnTimerProps) => {
  const { game } = useSkyjo()

  let interval: NodeJS.Timeout | null = null

  const turnTime = game.settings.private
    ? CoreConstants.AFK_TIMEOUT.PRIVATE
    : CoreConstants.AFK_TIMEOUT.PUBLIC

  const [timeLeft, setTimeLeft] = useState<number>(turnTime)

  useEffect(() => {
    if (interval) clearInterval(interval)
    if (!turnStartTime) return

    const now = dayjs()
    const elapsedTime = now.diff(turnStartTime, "ms")
    setTimeLeft(turnTime - elapsedTime)

    interval = setInterval(() => {
      if (timeLeft <= 0 && interval) {
        clearInterval(interval)
        return
      }

      setTimeLeft((prev) => {
        return Math.max(0, prev - 1000)
      })
    }, 1000)

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [turnStartTime])

  if (!turnStartTime) return null
  if (game.status !== CoreConstants.GAME_STATUS.PLAYING) return null

  const formattedTime = dayjs(timeLeft).format("mm:ss")
  const timeLeftVariant =
    timeLeft <= 10000 ? "danger" : timeLeft <= 15000 ? "warning" : "normal"

  return (
    <span
      className={cn(
        turnTimerTextVariants({ timeLeft: timeLeftVariant }),
        className,
      )}
    >
      {timeLeft > 0 ? formattedTime : "00:00"}
    </span>
  )
}

export { TurnTimer }
