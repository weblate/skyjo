import { constructTagArray } from "@skymo/core"
import { Locales } from "@skymo/shared/constants"
import { UserRecentActivity } from "@skymo/shared/types"
import { cva } from "class-variance-authority"
import dayjs from "dayjs"
import { CalendarIcon, ClockIcon, CrownIcon, HashIcon } from "lucide-react"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { GameTagServer } from "@/components/GameTag/GameTagServer"

const rankVariants = cva("px-3 py-1 rounded-full text-sm font-medium", {
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
    },
  },
  compoundVariants: [
    {
      rank: [4, 5, 6, 7, 8],
      className:
        "bg-neutral-100 dark:bg-neutral-900/30 text-neutral-800 dark:text-neutral-300",
    },
  ],
})

interface RecentActivityListProps {
  games: UserRecentActivity[]
  locale: Locales
}
export const RecentActivityList = async ({
  games,
  locale,
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
    <div className="space-y-6">
      <div className="space-y-4">
        {games.map((game) => {
          const tags = constructTagArray(game.settings)

          return (
            <div
              key={game.id}
              className="p-4 border-b-2 border-black last:border-b-0"
            >
              <div className="flex flex-row items-center gap-4 justify-between">
                <div className="flex flex-col gap-2">
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

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-sm text-black/60 dark:text-dark-font/60">
                      <CalendarIcon className="size-4" />
                      <span>
                        {dayjs(game.finishedAt).format("DD MMMM YYYY - HH:mm")}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-sm text-black/60 dark:text-dark-font/60">
                      <ClockIcon className="size-4" />
                      <span>
                        {dayjs(game.finishedAt).diff(
                          dayjs(game.createdAt),
                          "minute",
                        )}{" "}
                        min
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className={rankVariants({
                      rank: [1, 2, 3, 4, 5, 6, 7, 8].includes(game.rank)
                        ? (game.rank as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8)
                        : (8 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8),
                    })}
                  >
                    {game.rank === 1 ? (
                      <span className="flex flex-row items-center gap-1">
                        <CrownIcon className="size-4 text-amber-500 fill-amber-500" />
                        1
                      </span>
                    ) : (
                      <span className="flex flex-row items-center gap-0.5">
                        <HashIcon className="size-4 fill-current" />
                        {game.rank}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
