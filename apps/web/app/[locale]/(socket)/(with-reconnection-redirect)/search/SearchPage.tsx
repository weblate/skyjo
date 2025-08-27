"use client"

import { PublicGameTag } from "@skymo/core"
import type { GetPublicGamesError, PublicGame } from "@skymo/shared/types"
import { jsonError } from "@skymo/shared/utils"
import { useQuery } from "@tanstack/react-query"
import { HomeIcon, PlusIcon, RefreshCwIcon } from "lucide-react"
import dynamic from "next/dynamic"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { toast } from "sonner"
import { PenaltyCheck } from "@/components/PenaltyCheck"
import { useRouter } from "@/i18n/routing"
import { cn } from "@/lib/utils"
import { GamesList } from "./GamesList"
import { TagsFilter } from "./TagsFilter"

const MAX_GAMES_PER_PAGE = 20

const SearchPageComponent = () => {
  const router = useRouter()
  const t = useTranslations("pages.Search.header")
  const tErrors = useTranslations("errors")

  const [buttonLoading, setButtonLoading] = useState(false)
  const [selectedTags, setSelectedTags] = useState<PublicGameTag[]>([])

  const page = 1
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["publicGames", page],
    queryFn: async (): Promise<PublicGame[]> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/games/public?nbPerPage=${MAX_GAMES_PER_PAGE}&page=${page}`,
      )

      if (!res.ok) {
        const error = await jsonError<GetPublicGamesError>(res)
        toast.error(tErrors(error))
        return []
      }

      const { games } = await res.json()
      return games
    },
    refetchInterval: 30000,
    retryDelay: (attemptIndex) => {
      return Math.min(1000 * 2 ** attemptIndex, 30000)
    },
  })

  const onTagClick = (tag: PublicGameTag) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag)
      return [...prev, tag]
    })
  }

  const filteredGames =
    selectedTags.length > 0
      ? data?.filter((game) =>
          selectedTags.every((tag) => game.tags.includes(tag)),
        )
      : data

  const onJoinGameError = () => {
    refetch()
    setButtonLoading(false)
  }

  return (
    <>
      <PenaltyCheck />
      <header className="flex flex-row items-center justify-between">
        <div className="flex flex-row gap-4">
          <button
            className="size-6 text-black dark:text-dark-font cursor-pointer"
            onClick={() => router.replace("/")}
            title={t("back")}
          >
            <HomeIcon className="size-6" />
          </button>
          <span className="size-6" />
        </div>
        <h2 className="text-black dark:text-dark-font text-center text-2xl">
          {t("title")}
        </h2>
        <div className="flex flex-row gap-4">
          <button
            className="size-6 text-black dark:text-dark-font disabled:opacity-50 cursor-pointer"
            onClick={() => refetch()}
            disabled={isFetching}
            title={t("refresh")}
          >
            <RefreshCwIcon
              className={cn("size-6", isFetching && "animate-spin")}
            />
          </button>
          <button
            className="size-6 text-black dark:text-dark-font disabled:opacity-50 cursor-pointer"
            onClick={() => router.replace("/create?private=false")}
            title={t("create-button.title")}
            disabled={buttonLoading}
          >
            <PlusIcon className="size-6" />
          </button>
        </div>
      </header>
      <TagsFilter selectedTags={selectedTags} onTagClick={onTagClick} />
      <GamesList
        games={filteredGames}
        isFetching={isFetching}
        buttonLoading={buttonLoading}
        setButtonLoading={setButtonLoading}
        onTagClick={onTagClick}
        onJoinGameError={onJoinGameError}
      />
    </>
  )
}

const SearchSkeleton = () => {
  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-row items-center justify-between">
        <div className="bg-zinc-200 rounded-lg animate-pulse size-6" />
        <div className="bg-zinc-200 rounded-lg animate-pulse w-40 h-5" />
        <div className="flex flex-row gap-4">
          <div className="bg-zinc-200 rounded-lg animate-pulse size-6" />
          <div className="bg-zinc-200 rounded-lg animate-pulse size-6" />
        </div>
      </header>
      <div className="flex flex-row items-center gap-2">
        <div className="bg-zinc-200 rounded-lg animate-pulse w-16 h-5" />
        <div className="bg-zinc-200 rounded-lg animate-pulse size-5" />
      </div>
      <div className="flex flex-col gap-4 justify-center items-center pb-8">
        <div className="bg-zinc-200 rounded-lg animate-pulse w-16 h-5" />
      </div>
    </div>
  )
}

export const SearchPage = dynamic(() => Promise.resolve(SearchPageComponent), {
  ssr: false,
  loading: () => <SearchSkeleton />,
})
