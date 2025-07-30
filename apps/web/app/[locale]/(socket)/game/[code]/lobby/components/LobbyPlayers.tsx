"use client"

import { Constants as CoreConstants } from "@skymo/core"
import { ClassValue } from "clsx"
import { useTranslations } from "next-intl"
import { UserAvatar } from "@/components/UserAvatar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useGame } from "@/contexts/GameContext"
import { isHost } from "@/lib/game"

interface LobbyPlayersProps {
  className?: ClassValue
}

export const LobbyPlayers = ({ className }: LobbyPlayersProps) => {
  const t = useTranslations("pages.Lobby")
  const { player, game, actions } = useGame()
  const host = isHost(game, player?.id)

  return (
    <div
      className={`block bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-2xl w-full lg:w-80 p-4 lg:p-8 ${className ?? ""}`}
    >
      <h3 className="text-black dark:text-dark-font text-center text-xl">
        {t("player-section.title", {
          nbPlayers: game.players.length,
          maxPlayers: game.settings.maxPlayers,
        })}
      </h3>
      {host && (
        <Select
          value={game.settings.maxPlayers.toString()}
          onValueChange={(value) => actions.updateMaxPlayers(+value)}
        >
          <SelectTrigger className="mt-2">
            <SelectValue placeholder={t("player-section.select.placeholder")} />
          </SelectTrigger>
          <SelectContent>
            {Array.from(
              {
                length: CoreConstants.DEFAULT_GAME_SETTINGS.MAX_PLAYERS - 1,
              },
              (_, index) =>
                index + CoreConstants.DEFAULT_GAME_SETTINGS.MIN_PLAYERS,
            ).map((value) => (
              <SelectItem
                key={value}
                value={value.toString()}
                disabled={value < game.players.length}
              >
                {t("player-section.select.item", { value })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <div className="flex flex-row flex-wrap justify-center gap-2 mt-2 lg:mt-5">
        {game.players.map((player) => (
          <UserAvatar key={player.id} player={player} size="small" />
        ))}
      </div>
    </div>
  )
}
