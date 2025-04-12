"use client"

import { Button } from "@/components/ui/button"
import { useGame } from "@/contexts/GameContext"
import { useSocket } from "@/contexts/SocketContext"
import { useRouter } from "@/i18n/routing"
import { isHost } from "@/lib/game"
import { cn } from "@/lib/utils"
import { UpdateGameSettings } from "@skymo/shared/validations"
import { TimerIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import { useEffect, useRef, useState } from "react"
import { useLocalStorage } from "react-use"

// const SOUNDS = {
//   countdown: new Howl({ src: ["/sounds/countdown.ogg"] }),
//   gameStarting: new Howl({ src: ["/sounds/game-starting.ogg"] }),
// }

type LobbyCountdownProps = {
  gameCode: string
  className?: string
}
export const LobbyCountdown = ({
  gameCode,
  className,
}: LobbyCountdownProps) => {
  const { player, game, gameStatus } = useGame()
  const { socket } = useSocket()
  const router = useRouter()
  const [_gameSettingsLocalStorage, setGameSettingsLocalStorage] =
    useLocalStorage<UpdateGameSettings>("gameSettings")

  const [isLoading, setIsLoading] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const countdownValueRef = useRef<number | null>(null)

  const isUserHost = isHost(game, player?.id)
  const hasMinPlayers = game.players.length >= 2

  const clearCountdownInterval = (): void => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
      countdownIntervalRef.current = undefined
    }
  }

  useEffect(() => {
    if (!socket) return

    const handleCountdownStarted = (endTimestamp: number) => {
      const calculateTimeLeft = () => {
        const difference = endTimestamp - Date.now()
        // Always less than 5 seconds and never under 0
        const safeDifference = Math.max(0, Math.min(5000, difference))

        return Math.ceil(safeDifference / 1000)
      }

      const initialTime = calculateTimeLeft()
      setCountdown(initialTime)
      countdownValueRef.current = initialTime
      // SOUNDS.countdown.play()

      clearCountdownInterval()

      countdownIntervalRef.current = setInterval(() => {
        const timeLeft = calculateTimeLeft()

        setCountdown(timeLeft)
        countdownValueRef.current = timeLeft

        // if (timeLeft > 0 && timeLeft) SOUNDS.countdown.play()

        if (timeLeft <= 0) {
          clearCountdownInterval()
        }
      }, 1000)
    }

    const handleCountdownCanceled = () => {
      clearCountdownInterval()
      setCountdown(null)
      countdownValueRef.current = null
      setIsLoading(false)
    }

    const handleRateLimit = () => {
      setTimeout(() => {
        setIsLoading(false)
      }, 8000)
    }

    socket.on("game:countdown-started", handleCountdownStarted)
    socket.on("game:countdown-canceled", handleCountdownCanceled)
    socket.on("error:rate-limit", handleRateLimit)

    return () => {
      socket.off("game:countdown-started", handleCountdownStarted)
      socket.off("game:countdown-canceled", handleCountdownCanceled)
      socket.off("error:rate-limit", handleRateLimit)
      clearCountdownInterval()
    }
  }, [socket])

  useEffect(() => {
    if (!gameStatus.isLobby) {
      clearCountdownInterval()
      // SOUNDS.gameStarting.play()
      router.replace(`/game/${gameCode}`)
    }
  }, [gameStatus.isLobby, gameCode, router])

  const startCountdown = () => {
    if (isLoading) return

    setIsLoading(true)
    setGameSettingsLocalStorage(game.settings)

    try {
      socket?.timeout(7000).emit("game:start-countdown")
    } catch (error) {
      console.error("Socket error while starting countdown:", error)
      setIsLoading(false)
    }
  }

  const cancelCountdown = () => {
    socket?.emit("game:cancel-countdown")
  }

  if (!isUserHost) {
    return (
      <PlayerView countdown={countdown} game={game} className={className} />
    )
  }

  return (
    <HostView
      countdown={countdown}
      hasMinPlayers={hasMinPlayers}
      isLoading={isLoading}
      onStartCountdown={startCountdown}
      onCancelCountdown={cancelCountdown}
      className={className}
    />
  )
}

type PlayerViewProps = {
  countdown: number | null
  game: ReturnType<typeof useGame>["game"]
  className?: string
}

const PlayerView = ({ countdown, game, className }: PlayerViewProps) => {
  const t = useTranslations("pages.Lobby")

  const getMessage = () => {
    if (countdown !== null) {
      return t("game-starting-in", { seconds: countdown })
    }

    return game.settings.isConfirmed
      ? t("waiting-host-to-start")
      : t("waiting-host-to-confirm-game-settings")
  }

  return (
    <p
      className={cn(
        "mt-4 text-center text-black dark:text-dark-font",
        className,
      )}
    >
      {getMessage()}
    </p>
  )
}

type HostViewProps = {
  countdown: number | null
  hasMinPlayers: boolean
  isLoading: boolean
  onStartCountdown: () => void
  onCancelCountdown: () => void
  className?: string
}

const HostView = ({
  countdown,
  hasMinPlayers,
  isLoading,
  onStartCountdown,
  onCancelCountdown,
  className,
}: HostViewProps) => {
  const t = useTranslations("pages.Lobby")

  if (countdown !== null) {
    return (
      <div className={cn("flex items-center justify-center gap-4", className)}>
        <div className="flex items-center gap-2">
          {countdown}
          <TimerIcon className="w-4 h-4" />
        </div>
        <Button onClick={onCancelCountdown}>{t("cancel")}</Button>
      </div>
    )
  }

  return (
    <Button
      onClick={onStartCountdown}
      disabled={!hasMinPlayers}
      loading={isLoading}
      className={className}
    >
      {t("start-game-button")}
    </Button>
  )
}
