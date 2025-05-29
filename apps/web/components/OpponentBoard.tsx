import { CardTable } from "@/components/CardTable"
import { UserContextMenu } from "@/components/UserContextMenu"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useGame } from "@/contexts/GameContext"
import { useSettings } from "@/contexts/SettingsContext"
import { getBoardScaleClass, getCurrentScore } from "@/lib/game"
import { cn } from "@/lib/utils"
import { Constants as CoreConstants, PlayerToJson } from "@skymo/core"
import { ClassValue } from "clsx"
import { UserXIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { TurnTimer } from "./TurnTimer"

interface OpponentBoardProps {
  opponent: PlayerToJson
  isPlayerTurn: boolean
  className?: ClassValue
}
const OpponentBoard = ({
  opponent,
  isPlayerTurn,
  className,
}: OpponentBoardProps) => {
  const ta = useTranslations("utils.avatar")
  const to = useTranslations("components.OpponentBoard")
  const { game } = useGame()
  const { settings } = useSettings()

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-start duration-300 ease-in-out w-fit h-full",
        className,
      )}
    >
      <ContextMenu>
        <ContextMenuTrigger className="flex flex-col items-center mb-2">
          <div className="relative">
            <TurnTimer
              className="absolute top-2 left-[200%]"
              turnStartTime={opponent.turnStartTime}
            />
            <Image
              src={`/avatars/${opponent.avatar}.svg`}
              width={32}
              height={32}
              alt={ta(opponent.avatar)}
              title={ta(opponent.avatar)}
              className={cn(
                "select-none dark:opacity-75 size-6 smh:size-8",
                isPlayerTurn && "animate-bounce",
              )}
              priority
            />
          </div>
          <div
            className={cn(
              "text-center select-none text-xs smh:text-sm text-black dark:text-dark-font flex flex-row items-center gap-1",
              isPlayerTurn && "font-semibold",
            )}
          >
            {opponent.name}
            {opponent.connectionStatus ===
              CoreConstants.CONNECTION_STATUS.LEAVE && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger className="relative">
                    <UserXIcon size={16} className="text-yellow-600" />
                  </TooltipTrigger>
                  <TooltipContent>{to("disconnected")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          {game.settings.showCurrentScore && (
            <p className="text-center select-none text-xs text-gray-500 dark:text-gray-400">
              {getCurrentScore(opponent)}
            </p>
          )}
        </ContextMenuTrigger>
        <UserContextMenu player={opponent} />
      </ContextMenu>
      <div
        className={cn(
          "transition-transform duration-500 ease-in-out",
          getBoardScaleClass(
            isPlayerTurn,
            settings.enlargeActivePlayerBoard,
            true,
          ),
        )}
      >
        <CardTable cards={opponent.cards} cardDisabled={true} />
      </div>
    </div>
  )
}

export default OpponentBoard
