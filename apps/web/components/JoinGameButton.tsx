"use client"

import { Button } from "@/components/ui/button"
import { usePlayer } from "@/contexts/PlayerContext"
import { useSocket } from "@/contexts/SocketContext"
import { cn } from "@/lib/utils"
import { ClassValue } from "clsx"
import { useTranslations } from "next-intl"
import { Dispatch, ReactNode, SetStateAction } from "react"

interface JoinGameButtonProps {
  gameCode: string
  loading: boolean
  setLoading: Dispatch<SetStateAction<boolean>>
  className?: ClassValue
  children?: ReactNode
  onError: () => void
}
export const JoinGameButton = ({
  gameCode,
  loading,
  setLoading,
  className,
  children,
  onError,
}: JoinGameButtonProps) => {
  const t = useTranslations("components.GameLobbyButtons")
  const { getPlayer, name } = usePlayer()
  const { joinGame } = useSocket()

  const handleJoiningGame = async () => {
    setLoading(true)
    Howler.ctx.resume()
    const player = getPlayer()

    joinGame(player, gameCode, onError)
  }

  return (
    <Button
      onClick={handleJoiningGame}
      disabled={!name}
      className={cn(className)}
      loading={loading}
      title={t("join-game-button")}
    >
      {children ?? t("join-game-button")}
    </Button>
  )
}
