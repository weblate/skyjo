import { Constants as CoreConstants } from "@skymo/core"
import { Locales } from "@skymo/shared/constants"
import type {
  UserGameStats,
  UserProfile as UserProfileType,
} from "@skymo/shared/types"
import { cva } from "class-variance-authority"
import { ClassValue } from "clsx"
import Image from "next/image"
import { getTranslations } from "next-intl/server"
import { cn } from "@/lib/utils"
import { UserStats } from "./UserStats"

export const backgroundVariants = cva(
  "rounded-full border-2 border-black size-20 flex items-center justify-center",
  {
    variants: {
      avatar: {
        [CoreConstants.AVATARS.BEE]: "bg-blue-200 dark:bg-blue-400",
        [CoreConstants.AVATARS.CRAB]: "bg-teal-200 dark:bg-teal-400",
        [CoreConstants.AVATARS.DOG]: "bg-sky-200 dark:bg-sky-400",
        [CoreConstants.AVATARS.EAGLE]: "bg-indigo-200 dark:bg-indigo-400",
        [CoreConstants.AVATARS.ELEPHANT]: "bg-orange-200 dark:bg-orange-400",
        [CoreConstants.AVATARS.FOX]: "bg-violet-200 dark:bg-violet-400",
        [CoreConstants.AVATARS.FROG]: "bg-rose-200 dark:bg-rose-400",
        [CoreConstants.AVATARS.JELLYFISH]: "bg-emerald-200 dark:bg-emerald-400",
        [CoreConstants.AVATARS.KOALA]: "bg-amber-200 dark:bg-amber-400",
        [CoreConstants.AVATARS.OCTOPUS]: "bg-cyan-200 dark:bg-cyan-400",
        [CoreConstants.AVATARS.PENGUIN]: "bg-slate-200 dark:bg-slate-400",
        [CoreConstants.AVATARS.TOUCAN]: "bg-yellow-200 dark:bg-yellow-400",
        [CoreConstants.AVATARS.TURTLE]: "bg-purple-200 dark:bg-purple-400",
        [CoreConstants.AVATARS.WHALE]: "bg-orange-200 dark:bg-orange-400",
        [CoreConstants.AVATARS.OWL]: "bg-teal-200 dark:bg-teal-400",
        [CoreConstants.AVATARS.CAT]: "bg-amber-200 dark:bg-amber-400",
      },
    },
  },
)

export const avatarVariants = cva("dark:opacity-90 select-none", {
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
  stats: UserGameStats | null
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

  const avatar = user.avatar

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

        <UserStats stats={stats} locale={locale} />
      </div>
    </div>
  )
}
