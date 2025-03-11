import { CardTable } from "@/components/CardTable"
import { UserContextMenu } from "@/components/UserContextMenu"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useSkyjo } from "@/contexts/SkyjoContext"
import { getCurrentScore } from "@/lib/skyjo"
import { cn } from "@/lib/utils"
import { Constants as CoreConstants, SkyjoPlayerToJson } from "@skyjo/core"
import { ClassValue } from "clsx"
import { UserXIcon } from "lucide-react"
import { useTranslations } from "next-intl"
import Image from "next/image"
import { TurnTimer } from "./TurnTimer"

type OpponentBoardProps = {
  opponent: SkyjoPlayerToJson
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
  const { game } = useSkyjo()

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-start duration-300 ease-in-out w-full h-full",
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
                "select-none dark:opacity-75",
                isPlayerTurn && "animate-bounce",
              )}
              priority
            />
          </div>
          <p
            className={cn(
              "text-center select-none text-sm text-black dark:text-dark-font flex flex-row items-center gap-1",
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
                  <TooltipContent>
                    <p>{to("disconnected")}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </p>
          {game.settings.showCurrentScore && (
            <p className="text-center select-none text-xs text-gray-500 dark:text-gray-400">
              {getCurrentScore(opponent)}
            </p>
          )}
        </ContextMenuTrigger>
        <UserContextMenu player={opponent} />
      </ContextMenu>
      <CardTable cards={opponent.cards} cardDisabled={true} />
    </div>
  )
}

export default OpponentBoard
