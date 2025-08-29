import { Constants as CoreConstants, PlayerToJson } from "@skymo/core"
import {
  CrownIcon,
  FrownIcon,
  MessageSquareIcon,
  MessageSquareOffIcon,
  ShieldBanIcon,
  UserRoundIcon,
  UserRoundXIcon,
} from "lucide-react"
import { useTranslations } from "next-intl"
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { useBan } from "@/contexts/BanContext"
import { useChat } from "@/contexts/ChatContext"
import { useGame } from "@/contexts/GameContext"
import { useHostTransfer } from "@/contexts/HostTransferContext"
import { useKick } from "@/contexts/KickContext"
import { useReport } from "@/contexts/ReportContext"
import { Link } from "@/i18n/routing"
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
  const { transferHost } = useHostTransfer()
  const t = useTranslations("components.Avatar")

  const hasMoreThanTwoPlayers = game.players.length > 2
  const isCurrentUserHost = isHost(game, currentPlayer.id)

  const isHostAndPrivate = isCurrentUserHost && game.settings.private

  const cannotKickPlayer =
    (kickVoteInProgress || !hasMoreThanTwoPlayers) && !isHostAndPrivate

  const handleKickPlayer = () => {
    if (cannotKickPlayer) return

    actions.initiateKickVote(player.id)
  }

  const handleBanPlayer = () => banPlayer(player.id)
  const handleTransferHost = () => transferHost(player.id)

  return (
    <ContextMenuContent>
      {player.username && (
        <>
          <ContextMenuItem asChild>
            <Link href={`/u/${player.username}`} target="_blank">
              <UserRoundIcon className="w-4 h-4 mr-2" />
              {t("context-menu.view-profile", { name: player.name })}
            </Link>
          </ContextMenuItem>
          <ContextMenuSeparator />
        </>
      )}

      <ContextMenuItem onClick={() => reportPlayer(player.id, reportMessageId)}>
        <FrownIcon className="w-4 h-4 mr-2" />
        {t("context-menu.report", { name: player.name })}
      </ContextMenuItem>

      {isCurrentUserHost && player.id !== currentPlayer.id && (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem
            onClick={handleTransferHost}
            disabled={
              player.connectionStatus !== CoreConstants.CONNECTION_STATUS.CONNECTED
            }
          >
            <CrownIcon className="w-4 h-4 mr-2" />
            {t("context-menu.transfer-host", { name: player.name })}
          </ContextMenuItem>
        </>
      )}

      <ContextMenuSeparator />
      <ContextMenuItem onClick={handleKickPlayer} disabled={cannotKickPlayer}>
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

      <ContextMenuSeparator />
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
