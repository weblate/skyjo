import { Constants, constructTagArray } from "@skymo/core"
import { Locales } from "@skymo/shared/constants"
import { UserRecentActivity } from "@skymo/shared/types"
import { cva, VariantProps } from "class-variance-authority"
import dayjs from "dayjs"
import {
  CalendarIcon,
  ClockIcon,
  CrownIcon,
  HashIcon,
  LockIcon,
  LockOpenIcon,
} from "lucide-react"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { GameTagServer } from "@/components/GameTag/GameTagServer"

interface RecentActivityListProps {
  games: UserRecentActivity[]
  locale: Locales
  username: string
}
export const RecentActivityList = async ({
  games,
  locale,
  username,
}: RecentActivityListProps) => {
  const t = await getTranslations("pages.UserProfile")
  const tAvatar = await getTranslations("utils.avatar")

  if (games.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-black/60 dark:text-dark-font/60">
          {t("recent-activity.no-activity")}
        </p>
      </div>
    )
  }

  return (
    <div>
      {games.map((game) => {
        const tags = constructTagArray(game.settings)

        // duration format HH:mm
        const duration = dayjs(game.finishedAt).diff(
          dayjs(game.createdAt),
          "minute",
        )
        const hours = Math.floor(duration / 60)
        const hoursText = hours.toString().padStart(2, "0")
        const minutes = duration % 60
        const minutesText = minutes.toString().padStart(2, "0")
        const durationText = `${hoursText}:${minutesText}`

        // Find the current user's player data to determine their state
        const currentUserPlayer = game.players.find(
          (player) => player.username?.toLowerCase() === username.toLowerCase(),
        )

        // Determine display state based on connection status and forfeit state
        let rankDisplayVariant: RankVariants["rank"]
        let rankDisplayText: string

        if (
          currentUserPlayer?.connectionStatus ===
            Constants.CONNECTION_STATUS.DISCONNECTED &&
          currentUserPlayer?.forfeited
        ) {
          rankDisplayVariant = "forfeited"
          rankDisplayText = t("recent-activity.forfeited")
        } else if (
          currentUserPlayer?.connectionStatus ===
            Constants.CONNECTION_STATUS.DISCONNECTED &&
          !currentUserPlayer?.forfeited
        ) {
          rankDisplayVariant = "disconnected"
          rankDisplayText = t("recent-activity.left")
        } else {
          // Normal rank display
          rankDisplayVariant = [1, 2, 3, 4, 5, 6, 7, 8].includes(game.rank)
            ? (game.rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)
            : (8 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)
          rankDisplayText = game.rank === 1 ? "1" : game.rank.toString()
        }

        return (
          <div
            key={game.id}
            className="py-6 px-2 sm:px-4 border-b-2 border-black last:border-b-0"
          >
            <div className="flex flex-row items-start gap-4 justify-between relative">
              <div className="flex flex-col gap-2 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                  <h3 className="font-medium text-black dark:text-dark-font">
                    {t("recent-activity.game-code", { code: game.code })}
                  </h3>

                  {tags.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {tags.map((tag) => (
                        <GameTagServer key={tag} tag={tag} locale={locale} />
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex flex-row items-center gap-1 sm:gap-2">
                  {game.players.map((player) => (
                    <div
                      key={player.name + player.rank}
                      className="flex flex-col items-center justify-center"
                    >
                      <Image
                        src={`/avatars/${player.avatar}.svg`}
                        width={20}
                        height={20}
                        alt={tAvatar(player.avatar)}
                        className="select-none dark:opacity-90"
                        title={player.name}
                        unoptimized
                        priority
                      />
                    </div>
                  ))}
                  {Array.from({
                    length: game.settings.maxPlayers - game.players.length,
                  }).map((_, index) => (
                    <div
                      key={game.code + index}
                      className="size-5 bg-gray-100 dark:bg-gray-700 rounded-full"
                    />
                  ))}
                </div>
                <div className="flex flex-row items-center gap-2">
                  <div className="flex items-center gap-1 text-sm mr-4">
                    {game.isPrivate ? (
                      <LockIcon className="size-4 text-black/60 dark:text-dark-font/60" />
                    ) : (
                      <LockOpenIcon className="size-4 text-black/60 dark:text-dark-font/60" />
                    )}
                    <span className="text-black/60 dark:text-dark-font/60">
                      {game.isPrivate ? t("stats.private") : t("stats.public")}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <ClockIcon className="size-4 text-black/60 dark:text-dark-font/60" />
                    <span className="text-black/60 dark:text-dark-font/60">
                      {durationText}
                    </span>
                  </div>
                  ·
                  <div className="flex items-center gap-1 text-sm">
                    <CalendarIcon className="size-4 text-black/60 dark:text-dark-font/60" />
                    <span className="text-black/60 dark:text-dark-font/60">
                      {dayjs(game.finishedAt).format("DD/MM/YYYY")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute right-0 top-0 sm:top-7 sm:right-0">
                <RankDisplay
                  rank={game.rank}
                  rankDisplayVariant={rankDisplayVariant}
                  rankDisplayText={rankDisplayText}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const rankVariants = cva(
  "px-3 py-1 rounded-full text-xs sm:text-sm font-medium",
  {
    variants: {
      rank: {
        1: "bg-yellow-200 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
        2: "bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
        3: "bg-orange-300/80 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300",
        4: "",
        5: "",
        6: "",
        7: "",
        8: "",
        forfeited:
          "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400",
        disconnected:
          "bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400",
      },
    },
    compoundVariants: [
      {
        rank: [4, 5, 6, 7, 8],
        className:
          "bg-neutral-100 dark:bg-neutral-900/30 text-neutral-800 dark:text-neutral-300",
      },
    ],
  },
)
type RankVariants = VariantProps<typeof rankVariants>

interface RankDisplayProps {
  rank: number
  rankDisplayVariant: RankVariants["rank"]
  rankDisplayText: React.ReactNode
}
const RankDisplay = ({
  rank,
  rankDisplayVariant,
  rankDisplayText,
}: RankDisplayProps) => {
  return (
    <div
      className={rankVariants({
        rank: rankDisplayVariant,
      })}
    >
      {rankDisplayVariant === "forfeited" ||
      rankDisplayVariant === "disconnected" ? (
        <span className="flex flex-row items-center gap-0.5">
          {rankDisplayText}
        </span>
      ) : rank === 1 ? (
        <span className="flex flex-row items-center gap-1">
          <CrownIcon className="size-4 text-amber-500 fill-amber-500" />1
        </span>
      ) : (
        <span className="flex flex-row items-center gap-0.5">
          <HashIcon className="size-4 fill-current" />
          {rank}
        </span>
      )}
    </div>
  )
}
