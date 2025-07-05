import { PlayerToJson } from "@skymo/core"
import {
  FrownIcon,
  MessageSquareIcon,
  MessageSquareOffIcon,
  ShieldBanIcon,
  UserRoundXIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu"
import { useBan } from "@/contexts/BanContext"
import { useChat } from "@/contexts/ChatContext"
import { useGame } from "@/contexts/GameContext"
import { useKick } from "@/contexts/KickContext"
import { useReport } from "@/contexts/ReportContext"
import { isHost } from "@/lib/game"

interface UserContextMenuProps {
  player: PlayerToJson
  reportMessageId?: string
}
const UserContextMenu = ({ player, reportMessageId }: UserContextMenuProps) => {
  const { unmutePlayer, mutePlayer, mutedPlayers } = useChat()
  const { reportPlayer } = useReport()
  const { actions, kickVoteInProgress } = useKick()
  const { game, player: currentPlayer } = useGame()
  const { banPlayer } = useBan()
  const t = useTranslations("components.Avatar")

  const handleKickPlayer = () => {
    if ((hasLessThanThreePlayers || kickVoteInProgress) && !isCurrentUserHost)
      return

    actions.initiateKickVote(player.id)
  }

  const handleBanPlayer = () => {
    banPlayer(player.id)
  }

  const hasLessThanThreePlayers = game.players.length <= 2
  const isCurrentUserHost = isHost(game, currentPlayer.id)

  const isHostAndPrivate = isCurrentUserHost && game.settings.private

  return (
    <ContextMenuContent>
      <ContextMenuItem onClick={() => reportPlayer(player.id, reportMessageId)}>
        <FrownIcon className="w-4 h-4 mr-2" />
        {t("context-menu.report", { name: player.name })}
      </ContextMenuItem>
      <ContextMenuItem
        onClick={handleKickPlayer}
        disabled={
          (kickVoteInProgress || hasLessThanThreePlayers) && isHostAndPrivate
        }
      >
        <UserRoundXIcon className="w-4 h-4 mr-2" />
        {t(
          isHostAndPrivate ? "context-menu.kick" : "context-menu.vote-to-kick",
          { name: player.name },
        )}
      </ContextMenuItem>

      {isHostAndPrivate && (
        <ContextMenuItem
          onClick={handleBanPlayer}
          className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900 dark:hover:text-red-300"
        >
          <ShieldBanIcon className="w-4 h-4 mr-2" />
          {t("context-menu.ban", { name: player.name })}
        </ContextMenuItem>
      )}

      {mutedPlayers.includes(player.name) ? (
        <ContextMenuItem onClick={() => unmutePlayer(player.name)}>
          <MessageSquareIcon className="w-4 h-4 mr-2" />
          {t("context-menu.unmute", { name: player.name })}
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={() => mutePlayer(player.name)}>
          <MessageSquareOffIcon className="w-4 h-4 mr-2" />
          {t("context-menu.mute", { name: player.name })}
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  )
}

export { UserContextMenu }
