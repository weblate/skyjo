"use client"

import type { UserGameStats } from "@skymo/shared/types"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn, formatCompactNumber } from "@/lib/utils"

interface UserStatsProps {
  stats: UserGameStats | null
  locale: string
}

interface StatItem {
  key: string
  label: string
  value: string
  tooltip?: React.ReactNode
}

const createTooltipContent = (
  title: string,
  publicLabel: string,
  privateLabel: string,
  publicValue: string,
  privateValue: string,
) => (
  <div className="space-y-1">
    <div className="font-medium">{title}</div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      <div>{publicLabel}:</div>
      <div className="text-right">{publicValue}</div>
      <div>{privateLabel}:</div>
      <div className="text-right">{privateValue}</div>
    </div>
  </div>
)

const StatItemComponent = ({ item }: { item: StatItem }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <div
        className={cn(
          "flex flex-col items-center w-32",
          item.tooltip && "cursor-help",
        )}
      >
        <p className="text-sm text-black/60 dark:text-dark-font/60">
          {item.label}
        </p>
        <p className="text-lg font-medium text-black dark:text-dark-font text-center test:text-left">
          {item.value}
        </p>
      </div>
    </TooltipTrigger>
    {item.tooltip && (
      <TooltipContent side="top" className="max-w-xs">
        {item.tooltip}
      </TooltipContent>
    )}
  </Tooltip>
)

export const UserStats = ({ stats, locale }: UserStatsProps) => {
  const t = useTranslations("pages.UserProfile")

  const statItems = useMemo((): StatItem[] => {
    if (!stats) {
      return [
        {
          key: "total-games",
          label: t("stats.total-games"),
          value: "0",
        },
        {
          key: "win-rate",
          label: t("stats.win-rate"),
          value: "-",
        },
        {
          key: "average-rank",
          label: t("stats.average-rank"),
          value: "-",
        },
      ]
    }

    return [
      {
        key: "total-games",
        label: t("stats.total-games"),
        value: formatCompactNumber(stats.totalGames.total, locale),
        tooltip: createTooltipContent(
          t("stats.total-games"),
          t("stats.public"),
          t("stats.private"),
          formatCompactNumber(stats.totalGames.public, locale),
          formatCompactNumber(stats.totalGames.private, locale),
        ),
      },
      {
        key: "win-rate",
        label: t("stats.win-rate"),
        value:
          stats.totalGames.total > 0
            ? `${stats.winRate.total.toFixed(1)}%`
            : "-",
        tooltip: createTooltipContent(
          t("stats.win-rate"),
          t("stats.public"),
          t("stats.private"),
          stats.winRate.public > 0
            ? `${stats.winRate.public.toFixed(1)}%`
            : "-",
          stats.winRate.private > 0
            ? `${stats.winRate.private.toFixed(1)}%`
            : "-",
        ),
      },
      {
        key: "average-rank",
        label: t("stats.average-rank"),
        value:
          stats.averageRank.total > 0
            ? `#${stats.averageRank.total.toFixed(1)}`
            : "-",
        tooltip: createTooltipContent(
          t("stats.average-rank"),
          t("stats.public"),
          t("stats.private"),
          stats.averageRank.public > 0
            ? `#${stats.averageRank.public.toFixed(1)}`
            : "-",
          stats.averageRank.private > 0
            ? `#${stats.averageRank.private.toFixed(1)}`
            : "-",
        ),
      },
    ]
  }, [stats, locale, t])

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex flex-row justify-evenly test:justify-end test:gap-8 items-end w-full max-w-(--breakpoint-sm) mx-auto test:mx-0">
        {statItems.map((item) => (
          <StatItemComponent key={item.key} item={item} />
        ))}
      </div>
    </TooltipProvider>
  )
}
