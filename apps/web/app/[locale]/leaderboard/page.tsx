import { Locales } from "@skymo/shared/constants"
import { LeaderboardEntry } from "@skymo/shared/types"
import dayjs from "dayjs"
import { Home, Trophy } from "lucide-react"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import RefreshButton from "@/components/RefreshButton"
import { Button } from "@/components/ui/button"
import { Link } from "@/i18n/routing"
import CallToActionSection from "./CallToActionSection"

export const revalidate = 1800 // 30 minute cache

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
  lastUpdated: string
}
async function getLeaderboard(): Promise<LeaderboardData> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/games/leaderboard`,
    {
      next: { revalidate: 1800 }, // 30 minute cache for leaderboard
    },
  )

  if (!res.ok) {
    throw new Error("Failed to fetch leaderboard")
  }

  return res.json()
}

function getWinRateBadgeColor(winRate: number) {
  if (winRate >= 80) return "bg-green-500/20 text-green-800 dark:text-green-300"
  if (winRate >= 60) return "bg-blue-500/20 text-blue-800 dark:text-blue-300"
  if (winRate >= 40)
    return "bg-yellow-500/20 text-yellow-800 dark:text-yellow-300"
  return "bg-red-500/20 text-red-800 dark:text-red-300"
}

interface LeaderboardPageProps {
  params: Promise<{ locale: Locales }>
}

export default async function LeaderboardPage({
  params,
}: Readonly<LeaderboardPageProps>) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: "pages.Leaderboard" })

  try {
    const leaderboardData = await getLeaderboard()

    return (
      <div className="my-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="space-y-2">
            <h1 className="text-4xl md:text-5xl font-bold text-black dark:text-dark-font">
              {t("title")}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {t("subtitle")}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <div className="bg-container dark:bg-dark-container border-2 border-black dark:border-dark-border rounded-lg overflow-hidden">
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b-2 border-black dark:border-dark-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-black dark:text-dark-font">
                      {t("columns.rank")}
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-black dark:text-dark-font">
                      {t("columns.player")}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-black dark:text-dark-font">
                      {t("columns.wins")}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-black dark:text-dark-font">
                      {t("columns.totalGames")}
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-black dark:text-dark-font">
                      {t("columns.winRate")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/10 dark:divide-white/10">
                  {leaderboardData.leaderboard.map((player) => (
                    <tr
                      key={player.userId}
                      className="hover:bg-muted/30 transition-colors duration-200 group"
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center w-8">
                          {player.rank}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Link
                          href={`/u/${player.username}`}
                          className="flex items-center gap-3 transition-all text-black underline-offset-0 hover:underline hover:underline-offset-4"
                        >
                          <Image
                            src={`/avatars/${player.avatar}.svg`}
                            unoptimized
                            width={36}
                            height={36}
                            alt={player.name}
                            className="size-9"
                          />
                          <span className="font-medium text-black dark:text-dark-font">
                            {player.name}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-black dark:text-dark-font">
                          {player.wins}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="text-black dark:text-dark-font">
                          {player.totalGames}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getWinRateBadgeColor(player.winRate)}`}
                        >
                          {player.winRate.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-sm text-right text-black/80 dark:text-dark-font">
            {t("lastUpdated", {
              date: dayjs(leaderboardData.lastUpdated).format(
                "DD/MM/YYYY HH:mm Z",
              ),
            })}
          </p>
        </div>

        {/* Call to Action */}
        <CallToActionSection />
      </div>
    )
  } catch {
    return (
      <div className="text-center py-16">
        <div className="space-y-4">
          <Trophy className="h-16 w-16 text-muted-foreground mx-auto" />
          <div className="space-y-2">
            <h1 className="text-4xl font-bold text-black dark:text-dark-font">
              {t("title")}
            </h1>
            <p className="text-lg text-muted-foreground">{t("error")}</p>
            <p className="text-sm text-muted-foreground">
              {t("tryAgainLater")}
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <RefreshButton>{t("errorActions.refresh")}</RefreshButton>
            <Link href="/">
              <Button variant="small">
                <Home className="h-4 w-4 mr-2" />
                {t("errorActions.backHome")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }
}
