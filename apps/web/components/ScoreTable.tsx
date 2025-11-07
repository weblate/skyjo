import { getPlayerRanks, PlayerToJson } from "@skymo/core"
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

const getSortedPlayers = (
  players: PlayerToJson[],
  playerRanks: Record<string, number | string>,
) => {
  const sortedPlayers = players.sort((a, b) => {
    const aRank = playerRanks[a.id]
    const bRank = playerRanks[b.id]
    if (aRank === "-" && bRank !== "-") return 1
    if (aRank !== "-" && bRank === "-") return -1
    if (aRank === "-" && bRank === "-") return a.name.localeCompare(b.name)
    return Number(aRank) - Number(bRank)
  })

  return sortedPlayers
}

interface ScoreTableProps {
  players: PlayerToJson[]
  scrollToEnd?: boolean
}

const ScoreTable = ({ players, scrollToEnd = false }: ScoreTableProps) => {
  const t = useTranslations("components.ScoreTable")

  const nbRounds = players[0].scores.length

  useEffect(() => {
    if (!scrollToEnd) return

    const table = document.querySelector("#end-round-table")
    table?.scrollIntoView({
      block: "end",
      inline: "end",
    })
  }, [scrollToEnd])

  const playerRanks = getPlayerRanks(players)
  const sortedPlayers = getSortedPlayers(players, playerRanks)

  return (
    <Table id="end-round-table" className="bg-container">
      <TableHeader>
        <TableRow>
          <TableHead className="sticky left-0 z-10 w-20 text-center">
            {t("rank")}
          </TableHead>
          <TableHead className="sticky left-14 z-10">{t("name")}</TableHead>
          {Array.from({ length: nbRounds }).map((_, index) => (
            <TableHead
              key={`round-${index}`}
              className="text-center text-nowrap w-28"
            >
              {t("round")} {index + 1}
            </TableHead>
          ))}
          <TableHead className="sticky right-0 z-10 font-[550] w-28 text-center">
            {t("total")}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sortedPlayers.map((player) => (
          <TableRow key={player.id}>
            <TableCell className="sticky left-0 z-10 text-center w-fit">
              {playerRanks[player.id]}
            </TableCell>
            <TableCell className="sticky left-12 z-10 text-nowrap">
              {player.name}{" "}
              {nbRounds > 0 && playerRanks[player.id] === 1 && "🏆"}
            </TableCell>
            {player.scores.map((score, scoreIndex) => (
              <TableCell
                key={`${player.id}-round-${scoreIndex + 1}`}
                className="text-center"
              >
                {formatScoreDisplay(score)}
              </TableCell>
            ))}
            <TableCell className="sticky right-0 z-10 font-[550] text-center">
              {player.scores.reduce((a: number, b) => a + getScoreValue(b), 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}

export default ScoreTable
