import { CardTable } from "@/components/CardTable"
import { TurnTimer } from "@/components/TurnTimer"
import { useGame } from "@/contexts/GameContext"
import { useSettings } from "@/contexts/SettingsContext"
import { getCurrentScore } from "@/lib/game"
import { cn } from "@/lib/utils"
import { PlayerToJson } from "@skymo/core"
import { useTranslations } from "next-intl"
import Image from "next/image"

type PlayerBoardProps = {
  player: PlayerToJson
  isPlayerTurn: boolean
}

const PlayerBoard = ({ player, isPlayerTurn }: PlayerBoardProps) => {
  const { game, isActionPending, roundPhase, turnStatus } = useGame()
  const { settings } = useSettings()
  const ta = useTranslations("utils.avatar")
  const tp = useTranslations("components.PlayerBoard")

  const isActionablePlayerTurn =
    isPlayerTurn &&
    !isActionPending &&
    (turnStatus.isTurnACard ||
      turnStatus.isReplaceACard ||
      turnStatus.isThrowOrReplace)

  const showSelectionAnimation =
    roundPhase.isRevealCards || isActionablePlayerTurn

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-end col-start-2 duration-300 ease-in-out w-full h-full",
      )}
    >
      <CardTable
        cards={player.cards}
        showSelectionAnimation={showSelectionAnimation}
        size={settings.gameBoardSize}
      />
      <div className="relative">
        <TurnTimer
          className="absolute bottom-2 left-[200%]"
          turnStartTime={player.turnStartTime}
        />
        <Image
          src={`/avatars/${player.avatar}.svg`}
          width={32}
          height={32}
          alt={ta(player.avatar)}
          title={ta(player.avatar)}
          className={cn(
            "mt-4 select-none dark:opacity-75",
            isPlayerTurn && "animate-bounce",
          )}
          priority
        />
      </div>
      <p
        className={cn(
          "text-center select-none text-sm text-black dark:text-dark-font",
          isPlayerTurn && "font-semibold",
        )}
      >
        {player.name} ({tp("you")})
      </p>
      {game.settings.showCurrentScore && (
        <p className="text-center select-none text-xs text-gray-500 dark:text-gray-400">
          {getCurrentScore(player)}
        </p>
      )}
    </div>
  )
}

export default PlayerBoard
