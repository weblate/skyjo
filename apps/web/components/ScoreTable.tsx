import { Constants as CoreConstants, PlayerToJson } from "@skymo/core"
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
  winner?: PlayerToJson
  scrollToEnd?: boolean
}
const ScoreTable = ({
  players,
  winner,
  scrollToEnd = false,
}: ScoreTableProps) => {
  const t = useTranslations("components.ScoreTable")

  const nbRounds = players[0].scores.length

  useEffect(() => {
    if (!scrollToEnd) return

    const table = document.querySelector("#end-round-table")

    table?.scrollIntoView({
      block: "end",
      inline: "end",
    })
  }, [])

  const sortedConnectedPlayers = players
    .filter(
      (player) =>
        player.connectionStatus === CoreConstants.CONNECTION_STATUS.CONNECTED,
    )
    .sort((a, b) => a.score - b.score)

  const sortedDisconnectedPlayers = players
    .filter(
      (player) =>
        player.connectionStatus !== CoreConstants.CONNECTION_STATUS.CONNECTED,
    )
    .sort((a, b) => a.score - b.score)

  const sortedPlayers = [
    ...sortedConnectedPlayers,
    ...sortedDisconnectedPlayers,
  ]

  return (
    <Table id="end-round-table" className="bg-container">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 w-full z-10">
            {t("name")}
          </TableHead>
          {Array.from({ length: nbRounds }).map((_, index) => (
            <TableHead
              key={`round-${index}`}
              className="text-center w-fit text-nowrap"
            >
              {t("round")} {index + 1}
            </TableHead>
          ))}
          <TableHead className="sticky right-0 w-full z-10 font-semibold">
            {t("total")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPlayers.map((player) => (
          <TableRow key={player.id}>
            <TableCell className="sticky left-0 z-10">
              {player.name} {winner?.id === player.id && "🏆"}
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
