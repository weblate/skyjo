"use client"

import { Button } from "@/components/ui/button"
import { useGame } from "@/contexts/GameContext"
import { isHost } from "@/lib/game"
import { cn } from "@/lib/utils"
import { useTranslations } from "next-intl"
import { LobbyCountdown } from "./LobbyCountdown"

type LobbyActionsProps = {
  gameCode: string
  className?: string
}

export const LobbyActions = ({ gameCode, className }: LobbyActionsProps) => {
  const t = useTranslations("pages.Lobby")
  const { player, game, actions } = useGame()
  const host = isHost(game, player?.id)

  const validateSettings = () => {
    if (!game.settings.isConfirmed && !game.settings.private) {
      return (
        <Button onClick={actions.toggleSettingsValidation}>
          {t("settings.validate-settings")}
        </Button>
      )
    }

    return <LobbyCountdown gameCode={gameCode} />
  }

  if (!host) {
    return <LobbyCountdown gameCode={gameCode} className={className} />
  }

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row justify-center items-center gap-4 lg:gap-8",
        game.settings.private ? "mt-6 lg:mt-8" : "mt-4",
        className,
      )}
    >
      {(game.settings.private || !game.settings.isConfirmed) && (
        <Button onClick={actions.resetSettings} className="bg-slate-200">
          {t("settings.reset-settings")}
        </Button>
      )}

      {validateSettings()}
    </div>
  )
}
