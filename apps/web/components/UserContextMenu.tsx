import {
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu"
import { useBan } from "@/contexts/BanContext"
import { useChat } from "@/contexts/ChatContext"
import { useGame } from "@/contexts/GameContext"
import { useVoteKick } from "@/contexts/VoteKickContext"
import { isHost } from "@/lib/game"
import { PlayerToJson } from "@skymo/core"
import {
  MessageSquareIcon,
  MessageSquareOffIcon,
  ShieldBanIcon,
  UserRoundXIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"

const UserContextMenu = ({ player }: { player: PlayerToJson }) => {
  const { unmutePlayer, mutePlayer, mutedPlayers } = useChat()
  const { actions, kickVoteInProgress } = useVoteKick()
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

  return (
    <ContextMenuContent>
      <ContextMenuItem
        onClick={handleKickPlayer}
        disabled={
          (kickVoteInProgress || hasLessThanThreePlayers) && !isCurrentUserHost
        }
      >
        <UserRoundXIcon className="w-4 h-4 mr-2" />
        {t("context-menu.kick")}
      </ContextMenuItem>

      {isCurrentUserHost && game.settings.private && (
        <ContextMenuItem
          onClick={handleBanPlayer}
          className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900 dark:hover:text-red-300"
        >
          <ShieldBanIcon className="w-4 h-4 mr-2" />
          {t("context-menu.ban")}
        </ContextMenuItem>
      )}

      {mutedPlayers.includes(player.name) ? (
        <ContextMenuItem onClick={() => unmutePlayer(player.name)}>
          <MessageSquareIcon className="w-4 h-4 mr-2" />
          {t("context-menu.unmute")}
        </ContextMenuItem>
      ) : (
        <ContextMenuItem onClick={() => mutePlayer(player.name)}>
          <MessageSquareOffIcon className="w-4 h-4 mr-2" />
          {t("context-menu.mute")}
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  )
}

export { UserContextMenu }
