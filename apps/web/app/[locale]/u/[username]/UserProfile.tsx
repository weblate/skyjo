import { cn } from "@/lib/utils"
import { Constants as CoreConstants } from "@skymo/core"
import { Locales } from "@skymo/shared/constants"
import type {
  UserGameStats,
  UserProfile as UserProfileType,
} from "@skymo/shared/types"
import { cva } from "class-variance-authority"
import { ClassValue } from "clsx"
import { getTranslations } from "next-intl/server"
import Image from "next/image"

const backgroundVariants = cva(
  "rounded-full border-2 border-black size-20 flex items-center justify-center",
  {
    variants: {
      avatar: {
        [CoreConstants.AVATARS.BEE]: "bg-blue-200",
        [CoreConstants.AVATARS.CRAB]: "bg-teal-200",
        [CoreConstants.AVATARS.DOG]: "bg-sky-200",
        [CoreConstants.AVATARS.EAGLE]: "bg-indigo-200",
        [CoreConstants.AVATARS.ELEPHANT]: "bg-orange-200",
        [CoreConstants.AVATARS.FOX]: "bg-violet-200",
        [CoreConstants.AVATARS.FROG]: "bg-rose-200",
        [CoreConstants.AVATARS.JELLYFISH]: "bg-emerald-200",
        [CoreConstants.AVATARS.KOALA]: "bg-amber-200",
        [CoreConstants.AVATARS.OCTOPUS]: "bg-cyan-200",
        [CoreConstants.AVATARS.PENGUIN]: "bg-slate-200",
        [CoreConstants.AVATARS.TOUCAN]: "bg-yellow-200",
        [CoreConstants.AVATARS.TURTLE]: "bg-purple-200",
        [CoreConstants.AVATARS.WHALE]: "bg-orange-200",
        [CoreConstants.AVATARS.OWL]: "bg-teal-200",
        [CoreConstants.AVATARS.CAT]: "bg-amber-200",
      },
    },
  },
)

const avatarVariants = cva("dark:opacity-75 select-none", {
  variants: {
    avatar: {
      [CoreConstants.AVATARS.BEE]: "",
      [CoreConstants.AVATARS.CRAB]: "",
      [CoreConstants.AVATARS.DOG]: "translate-y-1",
      [CoreConstants.AVATARS.EAGLE]: "",
      [CoreConstants.AVATARS.ELEPHANT]: "",
      [CoreConstants.AVATARS.FOX]: "",
      [CoreConstants.AVATARS.FROG]: "translate-x-0.5",
      [CoreConstants.AVATARS.JELLYFISH]: "",
      [CoreConstants.AVATARS.KOALA]: "",
      [CoreConstants.AVATARS.OCTOPUS]: "translate-x-0.5",
      [CoreConstants.AVATARS.PENGUIN]: "",
      [CoreConstants.AVATARS.TOUCAN]: "",
      [CoreConstants.AVATARS.TURTLE]: "",
      [CoreConstants.AVATARS.WHALE]: "translate-y-0.5",
      [CoreConstants.AVATARS.OWL]: "",
      [CoreConstants.AVATARS.CAT]: "",
    },
  },
})

interface UserProfileProps {
  user: UserProfileType
  stats: UserGameStats
  locale: Locales
  className?: ClassValue
}
export const UserProfile = async ({
  user,
  locale,
  stats,
  className,
}: UserProfileProps) => {
  const tAvatar = await getTranslations({ locale, namespace: "utils.avatar" })
  const t = await getTranslations({ locale, namespace: "pages.UserProfile" })
  const statItems = [
    {
      label: t("stats.total-games"),
      value: stats?.totalGames?.toString() || "0",
    },
    {
      label: t("stats.win-rate"),
      value: stats?.winRate ? `${stats.winRate.toFixed(1)}%` : "0%",
    },
    {
      label: t("stats.average-rank"),
      value: stats?.averageRank ? `#${stats.averageRank.toFixed(1)}` : "-",
    },
  ]

  const avatar = CoreConstants.AVATARS.WHALE

  return (
    <div className={cn("space-y-6 flex flex-col", className)}>
      <div className="flex flex-col test:flex-row items-start test:items-center gap-6 test:justify-between">
        <div className="flex flex-col test:flex-row gap-2 test:gap-6 mx-auto test:mx-0 test:items-center">
          <div className={backgroundVariants({ avatar })}>
            <Image
              src={`/avatars/${avatar}.svg`}
              width={48}
              height={48}
              alt={tAvatar(user.avatar)}
              className={avatarVariants({ avatar })}
              priority
            />
          </div>
          <div className="flex flex-col">
            <h2 className="text-center test:text-left text-xl font-semibold text-black dark:text-dark-font">
              {user.name}
            </h2>
            <h3 className="text-center test:text-left text-black/60 dark:text-dark-font/60">
              {user.username}
            </h3>
          </div>
        </div>

        <div className="flex flex-row justify-evenly test:justify-end test:gap-8 items-end w-full max-w-screen-sm mx-auto test:mx-0">
          {statItems.map((item) => (
            <div key={item.label} className="flex flex-col items-center w-32">
              <p className="text-sm text-black/60 dark:text-dark-font/60">
                {item.label}
              </p>
              <p className="text-lg font-medium text-black dark:text-dark-font text-center test:text-left">
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
