import { Constants as CoreConstants, PlayerToJson } from "@skymo/core"
import clsx from "clsx"
import { useTranslations } from "next-intl"
import { useEffect } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatScoreDisplay, getScoreValue } from "@/lib/penalty-utils"

interface ScoreTableProps {
  players: PlayerToJson[]
  scrollToEnd?: boolean
}

const ScoreTable = ({ players, scrollToEnd = false }: ScoreTableProps) => {
  const t = useTranslations("components.ScoreTable")

  const nbRounds = players[0].scores.length
  const winningScore = Math.min(...players.map((p) => p.score))

  useEffect(() => {
    if (!scrollToEnd) return

    const table = document.querySelector("#end-round-table")
    table?.scrollIntoView({
      block: "end",
      inline: "end",
    })
  }, [scrollToEnd])

  const sortPlayers = (players: PlayerToJson[]) => {
    const winners = players
      .filter((p) => p.score === winningScore)
      .sort((a, b) => a.name.localeCompare(b.name))

    const losers = players
      .filter((p) => p.score !== winningScore)
      .sort((a, b) => a.score - b.score)

    return [...winners, ...losers]
  }

  const connectedPlayers = players.filter(
    (player) =>
      player.connectionStatus === CoreConstants.CONNECTION_STATUS.CONNECTED,
  )

  const disconnectedPlayers = players.filter(
    (player) =>
      player.connectionStatus !== CoreConstants.CONNECTION_STATUS.CONNECTED,
  )

  const sortedPlayers = [
    ...sortPlayers(connectedPlayers),
    ...sortPlayers(disconnectedPlayers),
  ]

  // Calculate ranks
  const ranks: { [playerId: string]: number } = {}
  let rank = 1
  for (let i = 0; i < sortedPlayers.length; i++) {
    if (i > 0 && sortedPlayers[i].score > sortedPlayers[i - 1].score) {
      rank = i + 1
    }
    ranks[sortedPlayers[i].id] = rank
  }

  return (
    <Table id="end-round-table" className="bg-container">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-10">{t("rank")}</TableHead>
          <TableHead className="sticky left-12 z-10">{t("name")}</TableHead>
          {Array.from({ length: nbRounds }).map((_, index) => (
            <TableHead
              key={`round-${index}`}
              className="text-center w-fit text-nowrap"
            >
              {t("round")} {index + 1}
            </TableHead>
          ))}
          <TableHead className="sticky right-0 z-10 font-semibold">
            {t("total")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPlayers.map((player) => (
          <TableRow
            key={player.id}
            className={clsx({
              "font-bold": player.score === winningScore,
            })}
          >
            <TableCell className="sticky left-0 z-10 text-center">
              {ranks[player.id]}
            </TableCell>
            <TableCell className="sticky left-12 z-10">
              {player.name} {player.score === winningScore && "🏆"}
            </TableCell>
            {player.scores.map((score, scoreIndex) => (
              <TableCell
                key={`${player.id}-round-${scoreIndex + 1}`}
                className="text-center w-fit"
              >
                {formatScoreDisplay(score)}
              </TableCell>
            ))}
            <TableCell className="sticky right-0 z-10 font-semibold text-center">
              {player.scores.reduce((a: number, b) => a + getScoreValue(b), 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default ScoreTable
