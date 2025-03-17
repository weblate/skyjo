import { ToastAction } from "@/components/ui/toast"
import { useSkyjo } from "@/contexts/SkyjoContext"
import { KickVoteToJson, Vote } from "@skyjo/core"
import { useTranslations } from "next-intl"
import { toast } from "sonner"

export const voteInitiatedToastId = "vote-initiated"
export const voteActionToastId = "vote-action"
export const voteWithoutActionToastId = "vote-without-action"
export const voteAgainstYouToastId = "vote-against-you"
export const voteFailedToastId = "vote-failed"
export const voteSucceededToastId = "vote-succeeded"
export const voteAgainstYouFailedToastId = "vote-against-you-failed"
export const voteAgainstYouSucceededToastId = "vote-against-you-succeeded"

export const useKickVoteToasts = () => {
  const { game, player } = useSkyjo()
  const t = useTranslations("components.KickVote")

  const showVoteInitiated = async (playerToKickName: string) => {
    await dismissAllKickVoteToasts()

    toast(t("vote-initiated.title"), {
      description: t("vote-initiated.description", {
        playerName: playerToKickName,
      }),
      duration: 5000,
      id: voteInitiatedToastId,
    })
  }

  const showVoteWithAction = async (
    kickVote: KickVoteToJson,
    voteToKick: (vote: boolean) => void,
  ) => {
    const playerToKickName = getPlayerToKick(kickVote.targetId)?.name
    const initiatorName = getInitiator(kickVote.initiatorId)?.name

    await dismissAllKickVoteToasts()

    toast(
      t("player-has-not-voted.title", {
        playerName: playerToKickName,
      }),
      {
        id: voteActionToastId,
        description:
          t("player-has-not-voted.description", {
            initiatorName,
            playerName: playerToKickName,
          }) + ` (${getYesVotes(kickVote.votes)}/${kickVote.requiredVotes})`,
        action: (
          <div className="flex flex-row items-center gap-2">
            <ToastAction
              onClick={() => voteToKick(true)}
              altText={t("player-has-not-voted.kick-button.alt", {
                playerName: playerToKickName,
              })}
            >
              {t("player-has-not-voted.kick-button.label")}
            </ToastAction>
            <ToastAction
              onClick={() => voteToKick(false)}
              altText={t("player-has-not-voted.ignore-button.alt", {
                playerName: playerToKickName,
              })}
              className="bg-gray-200"
            >
              {t("player-has-not-voted.ignore-button.label")}
            </ToastAction>
          </div>
        ),
        // yesVotes: getYesVotes(kickVote.votes),
        // requiredVotes: kickVote.requiredVotes,
        duration: 30000,
      },
    )
  }

  const showVoteWithoutAction = async (kickVote: KickVoteToJson) => {
    const vote = kickVote.votes.find((v) => v.playerId === player?.id)!.vote

    await dismissAllKickVoteToasts()

    toast(
      t("player-has-voted.title", {
        playerName: getPlayerToKick(kickVote.targetId)?.name,
      }),
      {
        description:
          t("player-has-voted.description", {
            vote: `${vote}`,
          }) + ` (${getYesVotes(kickVote.votes)}/${kickVote.requiredVotes})`,
        duration: 30000, // 30 seconds to vote
        id: voteWithoutActionToastId,
      },
    )
  }

  const showVoteAgainstYou = async (kickVote: KickVoteToJson) => {
    await dismissAllKickVoteToasts()

    toast(t("vote-against-you.title"), {
      description:
        t("vote-against-you.description", {
          initiatorName: getInitiator(kickVote.initiatorId)?.name,
        }) + ` (${getYesVotes(kickVote.votes)}/${kickVote.requiredVotes})`,
      duration: 12000,
      id: voteAgainstYouToastId,
    })
  }

  const showVoteFailed = async (kickedPlayerName: string) => {
    await dismissAllKickVoteToasts()

    toast(
      t("vote-failed.title", {
        playerName: kickedPlayerName,
      }),
      {
        description: t("vote-failed.description", {
          playerName: kickedPlayerName,
        }),
        duration: 5000,
        id: voteFailedToastId,
      },
    )
  }
  const showVoteAgainstYouFailed = async () => {
    await dismissAllKickVoteToasts()

    toast(t("vote-against-you-failed.title"), {
      description: t("vote-against-you-failed.description"),
      duration: 5000,
      id: voteAgainstYouFailedToastId,
    })
  }

  const showVoteSucceeded = async (kickedPlayerName: string) => {
    await dismissAllKickVoteToasts()

    toast(t("vote-succeeded.title", { playerName: kickedPlayerName }), {
      description: t("vote-succeeded.description", {
        playerName: kickedPlayerName,
      }),
      duration: 5000,
      id: voteSucceededToastId,
    })
  }
  const showVoteAgainstYouSucceeded = async () => {
    await dismissAllKickVoteToasts()

    toast(t("vote-against-you-succeeded.title"), {
      description: t("vote-against-you-succeeded.description"),
      duration: 5000,
      id: voteAgainstYouSucceededToastId,
    })
  }

  const showYouKickPlayer = async (playerToKickName: string) => {
    await dismissAllKickVoteToasts()

    toast(t("you-kick-player.title", { playerName: playerToKickName }))
  }

  const showHostKick = async (playerToKickName: string) => {
    await dismissAllKickVoteToasts()

    toast(t("host-kick.title", { playerName: playerToKickName }))
  }
  const showHostKickYou = async () => {
    toast(t("host-kick-you.title"))
  }
  //#region helpers
  const getPlayerToKick = (targetId: string) => {
    return game?.players.find((p) => p.id === targetId)
  }

  const getInitiator = (initiatorId: string) => {
    return game?.players.find((p) => p.id === initiatorId)
  }

  const getYesVotes = (votes: Vote[]) => {
    return votes.filter((v) => v.vote).length
  }
  //#endregion

  const dismissAllKickVoteToasts = async () => {
    toast.dismiss()
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return {
    showVoteInitiated,
    showVoteWithAction,
    showVoteAgainstYou,
    showVoteWithoutAction,
    showVoteAgainstYouFailed,
    showVoteFailed,
    showVoteSucceeded,
    showVoteAgainstYouSucceeded,
    showYouKickPlayer,
    showHostKick,
    showHostKickYou,
  }
}
