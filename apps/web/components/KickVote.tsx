"use client"

import { UserRoundXIcon } from "lucide-react"
import { AnimatePresence, m } from "motion/react"
import { useTranslations } from "next-intl"
import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useKick } from "@/contexts/KickContext"
import { cn } from "@/lib/utils"

const KickVote = () => {
  const {
    actions,
    kickVote,
    kickVoteStatus,
    playerToKick,
    isPlayerToKick,
    playerVote,
    hasVoted,
    yesVotes,
  } = useKick()
  const t = useTranslations("components.KickVote")

  const title = useMemo(() => {
    if (kickVoteStatus === "failed") {
      if (isPlayerToKick) {
        return t("vote-against-you-failed.title")
      }

      return t("vote-failed.title", {
        playerName: playerToKick?.name ?? "N/A",
      })
    }

    if (kickVoteStatus === "success") {
      return t("vote-succeeded.title", {
        playerName: playerToKick?.name ?? "N/A",
      })
    }

    if (isPlayerToKick) {
      return t("vote-against-you.title")
    }

    if (!hasVoted) {
      return t("player-has-not-voted.title", {
        playerName: playerToKick?.name ?? "N/A",
      })
    }

    return t("player-has-voted.title", {
      playerName: playerToKick?.name ?? "N/A",
    })
  }, [isPlayerToKick, hasVoted, playerToKick, t, kickVoteStatus])

  const description = useMemo(() => {
    if (kickVoteStatus === "failed") {
      if (isPlayerToKick) {
        return t("vote-against-you-failed.description")
      }

      return t("vote-failed.description", {
        playerName: playerToKick?.name ?? "N/A",
      })
    }

    if (kickVoteStatus === "success") {
      console.log("vote-succeeded.description", {
        playerName: playerToKick?.name ?? "N/A",
      })
      return t("vote-succeeded.description", {
        playerName: playerToKick?.name ?? "N/A",
      })
    }

    if (isPlayerToKick) {
      return t("vote-against-you.description")
    }

    if (!hasVoted) {
      return null
    }

    return t("player-has-voted.description", {
      playerName: playerToKick?.name ?? "N/A",
      vote: `${playerVote ?? false}`,
    })
  }, [isPlayerToKick, hasVoted, playerToKick, t, kickVoteStatus])

  const showVoteButtons = useMemo(() => {
    if (isPlayerToKick || kickVoteStatus !== "pending") {
      return false
    }

    return !hasVoted
  }, [isPlayerToKick, hasVoted, kickVoteStatus])

  const visible = kickVoteStatus !== null

  return (
    <AnimatePresence>
      {visible && (
        <div className="relative z-40">
          <div className="absolute top-[22svh] sm:top-[32svh] right-0 h-fit flex flex-row">
            <m.div
              variants={{
                open: { opacity: 1, width: "288px" },
                closed: { opacity: 0, width: 0 },
              }}
              initial="closed"
              exit="closed"
              animate="open"
              className={cn(
                "relative bg-white dark:bg-dark-body border-2 border-r-0 rounded-l-lg border-black dark:border-dark-border shadow-[3px_3px_0px_0px_rgba(0,0,0)] dark:shadow-[3px_3px_0px_0px_rgba(137,137,137)]",
              )}
            >
              <div className="flex flex-row items-center min-w-[256px]">
                {kickVoteStatus === "pending" && (
                  <span className="absolute top-2 right-2 text-sm text-black dark:text-dark-font">
                    {yesVotes}/{kickVote?.requiredVotes}
                  </span>
                )}
                <div className="flex flex-col px-6 py-4">
                  {title && (
                    <h3 className="font-semibold text-sm sm:text-base text-black dark:text-dark-font">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-xs sm:text-sm text-black dark:text-dark-font">
                      {description}
                    </p>
                  )}
                  {showVoteButtons && (
                    <div className="flex flex-row items-center gap-4 mt-5 w-full">
                      <Button
                        variant="small"
                        className="border-2 bg-white dark:bg-dark-body text-sm shadow-none dark:shadow-none active:shadow-none active:translate-x-0 active:translate-y-0 dark:active:shadow-none"
                        aria-label={t(
                          "player-has-not-voted.ignore-button.alt",
                          {
                            playerName: playerToKick?.name ?? "",
                          },
                        )}
                        onClick={() => actions.voteToKick(false)}
                      >
                        {t("player-has-not-voted.ignore-button.label")}
                      </Button>
                      <Button
                        variant="small"
                        color="destructive"
                        className="border-2"
                        shadow={false}
                        aria-label={t("player-has-not-voted.kick-button.alt", {
                          playerName: playerToKick?.name ?? "",
                        })}
                        onClick={() => actions.voteToKick(true)}
                      >
                        <UserRoundXIcon className="size-4" />
                        {t("player-has-not-voted.kick-button.label")}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </m.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  )
}

export { KickVote }
