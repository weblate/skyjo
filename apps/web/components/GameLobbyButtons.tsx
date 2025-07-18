"use client"

import { Howler } from "howler"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { usePlayer } from "@/contexts/PlayerContext"
import { useSocket } from "@/contexts/SocketContext"
import { useRouter } from "@/i18n/routing"

interface GameLobbyButtonsProps {
  gameCode?: string
}

const GameLobbyButtons = ({ gameCode }: GameLobbyButtonsProps) => {
  const { joinGame } = useSocket()
  const { getPlayer, name, savePlayer } = usePlayer()
  const t = useTranslations("components.GameLobbyButtons")
  const router = useRouter()

  const [loading, setLoading] = useState<boolean>(false)

  const hasGameCode = !!gameCode

  const errorCallback = () => setLoading(false)

  const handleJoiningGame = async () => {
    savePlayer()
    const player = getPlayer()

    joinGame(player, gameCode!, errorCallback)
  }

  const handleFindingGame = async () => {
    savePlayer()
    router.replace("/search")
  }

  const handleGameCreation = async () => {
    savePlayer()
    router.replace("/create?private=true")
  }

  const actions = {
    "join-game": handleJoiningGame,
    "find-game": handleFindingGame,
    "create-game": handleGameCreation,
  }

  const handleAction = (action: keyof typeof actions) => {
    setLoading(true)
    Howler.ctx.resume()

    actions[action]()
  }

  return (
    <div className="flex flex-col gap-2 mt-6">
      {hasGameCode && (
        <Button
          onClick={() => handleAction("join-game")}
          disabled={!name}
          className="w-full mb-4"
          loading={loading}
          title={t("join-game-button")}
        >
          {t("join-game-button")}
        </Button>
      )}
      <Button
        onClick={() => handleAction("find-game")}
        className="w-full"
        loading={loading}
        disabled={!name}
        title={t("find-game-button")}
      >
        {t("find-game-button")}
      </Button>
      <Button
        onClick={handleGameCreation}
        className="w-full"
        disabled={!name}
        loading={loading}
        title={t("create-game-button", { type: "private" })}
      >
        {t("create-game-button", { type: "private" })}
      </Button>
    </div>
  )
}

export default GameLobbyButtons
