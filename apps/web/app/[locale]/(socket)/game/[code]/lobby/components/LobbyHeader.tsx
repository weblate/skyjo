"use client"

import { ClassValue } from "clsx"
import { ArrowLeftIcon, LockIcon, UnlockIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGame } from "@/contexts/GameContext"
import { getHost, isHost } from "@/lib/game"

interface LobbyHeaderProps {
  className?: ClassValue
}

export const LobbyHeader = ({ className }: LobbyHeaderProps) => {
  const t = useTranslations("pages.Lobby")
  const { player, game, actions } = useGame()

  const host = isHost(game, player?.id)
  const hostName = getHost(game)?.name ?? ""
  const hostNameSliced =
    hostName.length > 12 ? hostName.slice(0, 8) + "..." : hostName

  return (
    <div
      className={`flex flex-row justify-between items-center mb-6 pt-4 sm:pt-8 px-4 sm:px-8 ${className ?? ""}`}
    >
      <button
        title={t(
          game.settings.private ? "leave-to-home" : "leave-to-public-game-list",
        )}
        onClick={actions.leave}
        className="top-4 left-4 size-6 cursor-pointer text-black dark:text-dark-font"
      >
        <ArrowLeftIcon className="size-6" />
      </button>
      <h2 className="text-black dark:text-dark-font text-center text-2xl">
        {t("title", {
          name: hostNameSliced,
        })}
      </h2>
      <TooltipProvider delayDuration={200}>
        <Tooltip defaultOpen={host}>
          <TooltipTrigger className="size-6 relative cursor-default text-black dark:text-dark-font">
            {game.settings.private ? (
              <LockIcon className="size-6" />
            ) : (
              <UnlockIcon className="size-6" />
            )}
          </TooltipTrigger>
          <TooltipContent>
            {game.settings.private
              ? t("settings.private.tooltip.on")
              : t("settings.private.tooltip.off")}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}
