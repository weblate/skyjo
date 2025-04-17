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

export const useKickToasts = () => {
  const t = useTranslations("components.KickVote")

  //#region vote kick
  const showVoteAgainstYouSucceeded = async () => {
    await dismissAllKickVoteToasts()

    toast(t("vote-against-you-succeeded.title"), {
      description: t("vote-against-you-succeeded.description"),
      duration: 5000,
      id: voteAgainstYouSucceededToastId,
    })
  }
  //#endregion vote kick
  
  //#region host kicks
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
  //#endregion host kicks


  const dismissAllKickVoteToasts = async () => {
    toast.dismiss()
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return {
    showVoteAgainstYouSucceeded,
    showYouKickPlayer,
    showHostKick,
    showHostKickYou,
  }
}
