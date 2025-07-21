import { Constants as CoreConstants, PlayerToJson } from "@skymo/core"
import { cva } from "class-variance-authority"
import type { ClassValue } from "clsx"
import { UserXIcon } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
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
import { TurnTimer } from "./TurnTimer"

const turnTimerVariants = cva("absolute", {
  variants: {
    layout: {
      vertical: "top-2 left-[200%]",
      horizontal: "-top-8 left-1/2 -translate-x-1/2",
    },
  },
  defaultVariants: {
    layout: "vertical",
  },
})

interface OpponentBoardProps {
  opponent: PlayerToJson
  isPlayerTurn: boolean
  className?: ClassValue
  layout?: "vertical" | "horizontal"
  side?: "left" | "right"
}
const OpponentBoard = ({
  opponent,
  isPlayerTurn,
  className,
  layout = "vertical",
  side,
}: OpponentBoardProps) => {
  const ta = useTranslations("utils.avatar")
  const to = useTranslations("components.OpponentBoard")
  const { game } = useGame()
  const { settings } = useSettings()

  const playerInfo = (
    <ContextMenu>
      <ContextMenuTrigger className="flex flex-col items-center mb-2">
        <div className="relative">
          <TurnTimer
            className={turnTimerVariants({ layout })}
            turnStartTime={opponent.turnStartTime}
          />
          <Image
            src={`/avatars/${opponent.avatar}.svg`}
            width={32}
            height={32}
            alt={ta(opponent.avatar)}
            title={ta(opponent.avatar)}
            className={cn(
              "select-none dark:opacity-90 size-6 smh:size-8",
              isPlayerTurn && "animate-bounce",
            )}
            priority
            unoptimized
          />
        </div>
        <div
          className={cn(
            "text-center select-none flex flex-row items-center gap-1",
            isPlayerTurn && "font-semibold",
          )}
        >
          <p className="text-ellipsis overflow-hidden whitespace-nowrap text-xs smh:text-sm text-black dark:text-dark-font w-20">
            {opponent.name}
          </p>
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
  )

  const cardTable = (
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
  )

  if (layout === "horizontal") {
    return (
      <div
        className={cn(
          "flex items-center justify-start duration-300 ease-in-out w-fit h-full gap-4",
          side === "right" ? "flex-row-reverse" : "flex-row",
          className,
        )}
      >
        {playerInfo}
        {cardTable}
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-start duration-300 ease-in-out w-fit h-full",
        className,
      )}
    >
      {playerInfo}
      {cardTable}
    </div>
  )
}

export default OpponentBoard
