"use client"

import { Constants as CoreConstants, PlayerToJson } from "@skymo/core"
import { CheckCircle2Icon, XCircleIcon } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { useTranslations } from "next-intl"
import { useEffect, useMemo, useState } from "react"
import { UserAvatar } from "@/components/UserAvatar"
import { UserContextMenu } from "@/components/UserContextMenu"
import { Button } from "@/components/ui/button"
import {
  ContextMenu,
  ContextMenuTriggerWithLeftClick,
} from "@/components/ui/context-menu"
import {
  MotionTableHeader,
  MotionTableRow,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from "@/components/ui/table"
import { useGame } from "@/contexts/GameContext"
import { useRouter } from "@/i18n/routing"
import { formatScoreDisplay } from "@/lib/penalty-utils"
import { calculatePlayerRanks, PlayerWithRank } from "@/lib/ranking"
import { cn, getRedirectionUrl } from "@/lib/utils"

const ResultsPage = () => {
  const { player: currentPlayer, game, actions } = useGame()
  const router = useRouter()
  const t = useTranslations("pages.ResultsPage")
  const [visibleRows, setVisibleRows] = useState<PlayerWithRank[]>([])

  const playersWithRanks = useMemo(
    () => calculatePlayerRanks(game.players),
    [game.players],
  )

  const {
    connectedPlayers,
    sortedNotDisconnectedPlayers,
    sortedDisconnectedPlayers,
  } = useMemo(() => {
    const connected = game.players.filter(
      (player) =>
        player.connectionStatus === CoreConstants.CONNECTION_STATUS.CONNECTED,
    )
    const notDisconnected = playersWithRanks.filter(
      (player) =>
        player.connectionStatus !==
        CoreConstants.CONNECTION_STATUS.DISCONNECTED,
    )
    const disconnected = playersWithRanks.filter(
      (player) =>
        player.connectionStatus ===
        CoreConstants.CONNECTION_STATUS.DISCONNECTED,
    )
    return {
      connectedPlayers: connected,
      sortedNotDisconnectedPlayers: notDisconnected,
      sortedDisconnectedPlayers: disconnected,
    }
  }, [game.players, playersWithRanks])

  const allRowsVisible =
    visibleRows.length >= sortedNotDisconnectedPlayers.length

  const hasMoreThanOneConnectedPlayer = connectedPlayers.length > 1

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (visibleRows.length < sortedNotDisconnectedPlayers.length) {
      const nextPlayer = sortedNotDisconnectedPlayers[visibleRows.length]

      interval = setInterval(() => {
        if (nextPlayer) setVisibleRows((prev) => [nextPlayer, ...prev])
      }, 2000)
    } else if (visibleRows.length === sortedNotDisconnectedPlayers.length) {
      interval = setInterval(() => {
        setVisibleRows((prev) => [...prev, ...sortedDisconnectedPlayers])
      }, 1000)
    }

    return () => clearInterval(interval)
  }, [
    visibleRows.length,
    sortedNotDisconnectedPlayers,
    sortedDisconnectedPlayers,
  ])

  useEffect(() => {
    router.replace(getRedirectionUrl(game.code, game.status))
  }, [game.status])

  const nbRounds = game.players[0].scores.length

  return (
    <AnimatePresence>
      <div className="ph-no-capture h-dvh w-dvw overflow-y-auto container py-10 flex lgh:items-center lgh:justify-center">
        <m.div
          className="h-fit w-full flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <h1 className="text-black dark:text-dark-font text-2xl font-semibold mb-4">
            {t("title")}
          </h1>
          <Table className="border-[1.5px] border-black dark:border-dark-border bg-container dark:bg-dark-container lg:w-2/3 mx-auto">
            {allRowsVisible && (
              <MotionTableHeader
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, display: "table-header-group" }}
                transition={{ delay: 0.2 }}
              >
                <TableRow>
                  <TableHead className="py-2 w-fit">{t("rank")}</TableHead>
                  <TableHead className="py-2 w-52">{t("player")}</TableHead>
                  {Array.from({ length: nbRounds }).map((_, index) => (
                    <TableHead
                      key={`round-${index}`}
                      className="text-left w-fit text-nowrap"
                    >
                      {t("round", { number: index + 1 })}
                    </TableHead>
                  ))}
                  <TableHead className="py-2 text-right font-semibold">
                    {t("total")}
                  </TableHead>
                </TableRow>
              </MotionTableHeader>
            )}
            <TableBody>
              {visibleRows.map((player) => {
                const isConnected =
                  player.connectionStatus !==
                  CoreConstants.CONNECTION_STATUS.DISCONNECTED

                return (
                  <MotionTableRow
                    key={player.id}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <TableCell className="w-8">
                      {isConnected ? (
                        allRowsVisible && player.rank
                      ) : player.forfeited ? (
                        <span className="text-gray-500">{t("forfeit")}</span>
                      ) : (
                        <span className="text-gray-500">
                          {t("disconnected")}
                        </span>
                      )}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "w-52 py-2 flex flex-row gap-2 items-center",
                        isConnected ? "grayscale-0" : "grayscale",
                      )}
                    >
                      {player.id === currentPlayer.id ? (
                        <Player player={player} />
                      ) : (
                        <ContextMenu>
                          <ContextMenuTriggerWithLeftClick
                            asChild
                            leftClickToOpen={true}
                          >
                            <div className="flex flex-row gap-2 items-center cursor-pointer">
                              <Player player={player} />
                            </div>
                          </ContextMenuTriggerWithLeftClick>
                          <UserContextMenu player={player} />
                        </ContextMenu>
                      )}
                    </TableCell>
                    {player.scores.map((score, scoreIndex) => (
                      <TableCell
                        key={`${player.id}-round-${scoreIndex + 1}`}
                        className="py-2"
                      >
                        {formatScoreDisplay(score)}
                      </TableCell>
                    ))}
                    <TableCell className="py-2 text-right font-semibold">
                      {player.score}
                    </TableCell>
                  </MotionTableRow>
                )
              })}
            </TableBody>
          </Table>

          {allRowsVisible && (
            <m.div
              className="mt-2 flex flex-col items-center gap-4"
              initial={{ display: "none", opacity: 0 }}
              animate={{ opacity: 1, display: "flex" }}
              transition={{ delay: 1 }}
            >
              {hasMoreThanOneConnectedPlayer && (
                <div className="flex flex-col gap-1 items-center">
                  <p className="text-black dark:text-dark-font">
                    {t("player-want-to-replay")}
                  </p>
                  <div className="flex flex-row gap-1">
                    {connectedPlayers.map((player) =>
                      player.wantsReplay ? (
                        <CheckCircle2Icon
                          key={player.id}
                          size={24}
                          className="text-emerald-600"
                        />
                      ) : (
                        <XCircleIcon
                          key={player.id}
                          size={24}
                          className="text-black dark:text-dark-font"
                        />
                      ),
                    )}
                  </div>
                </div>
              )}
              <Button
                onClick={actions.replay}
                className={cn(
                  "w-full",
                  hasMoreThanOneConnectedPlayer ? "" : "mt-6",
                )}
              >
                {currentPlayer.wantsReplay
                  ? t("replay-button.cancel")
                  : t("replay-button.replay")}
              </Button>
              <Button
                onClick={() => actions.leave()}
                className={cn(
                  "w-full",
                  hasMoreThanOneConnectedPlayer ? "mt-6" : "mt-2",
                )}
              >
                {t("leave-button")}
              </Button>
            </m.div>
          )}
        </m.div>
      </div>
    </AnimatePresence>
  )
}

const Player = ({ player }: { player: PlayerToJson }) => {
  return (
    <>
      <UserAvatar
        player={player}
        size="small"
        showName={false}
        allowContextMenu={true}
      />
      <p className="text-sm text-ellipsis overflow-hidden whitespace-nowrap">
        {player.name}
      </p>
    </>
  )
}

export default ResultsPage
