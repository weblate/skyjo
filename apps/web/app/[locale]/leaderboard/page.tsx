import { Locales } from "@skymo/shared/constants"
import dayjs from "dayjs"
import { Award, Medal, Trophy } from "lucide-react"
import { getTranslations } from "next-intl/server"

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar: string
  wins: number
  totalGames: number
  winRate: number
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  lastUpdated: string
}

async function getLeaderboard(): Promise<LeaderboardData> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/games/leaderboard`,
  )

  if (!res.ok) {
    throw new Error("Failed to fetch leaderboard")
  }

  return res.json()
}

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Trophy className="h-6 w-6 text-yellow-500" />
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />
    default:
      return <span className="font-bold text-lg">{rank}</span>
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: Locales }>
}) {
  const { locale } = await params
  const t = await getTranslations({
    locale,
    namespace: "pages.Leaderboard.head",
  })

  return {
    title: t("title"),
    description: t("description"),
    keywords: t("keywords"),
  }
}

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ locale: Locales }>
}) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "pages.Leaderboard" })

  try {
    const leaderboardData = await getLeaderboard()

    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-center mb-2">{t("title")}</h1>
          <p className="text-center text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                {t("lastUpdated", {
                  date: dayjs(leaderboardData.lastUpdated).format(
                    "DD/MM/YYYY HH:mm",
                  ),
                })}
              </p>
            </div>

            {leaderboardData.leaderboard.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">{t("noData")}</p>
              </div>
            ) : (
              <div className="rounded-lg border-2 border-black overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full bg-container">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">
                          {t("columns.rank")}
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          {t("columns.player")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("columns.wins")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("columns.totalGames")}
                        </th>
                        <th className="px-4 py-3 text-center font-medium">
                          {t("columns.winRate")}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {leaderboardData.leaderboard.map((player) => (
                        <tr
                          key={player.userId}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="px-4 py-4">
                            <div className="flex items-center justify-center w-8">
                              {getRankIcon(player.rank)}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={`/avatars/${player.avatar}.svg`}
                                alt={`${player.username} avatar`}
                                className="h-8 w-8 rounded-full"
                              />
                              <span className="font-medium">
                                {player.username}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-medium">
                            {player.wins}
                          </td>
                          <td className="px-4 py-4 text-center">
                            {player.totalGames}
                          </td>
                          <td className="px-4 py-4 text-center">
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                              {player.winRate.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  } catch (_error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">{t("title")}</h1>
          <p className="text-muted-foreground mb-4">{t("error")}</p>
          <p className="text-sm text-muted-foreground">{t("tryAgainLater")}</p>
        </div>
      </div>
    )
  }
}
