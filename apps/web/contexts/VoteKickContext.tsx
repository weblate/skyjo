import { useGame } from "@/contexts/GameContext"
import { useSocket } from "@/contexts/SocketContext"
import { useKickVoteToasts } from "@/hooks/useKickVoteToasts"
import { useRouter } from "@/i18n/routing"
import { isHost } from "@/lib/game"
import { KickVoteToJson } from "@skymo/core"
import {
  PropsWithChildren,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

type VoteKickContext = {
  actions: {
    initiateKickVote: (targetPlayerId: string) => void
    voteToKick: (vote: boolean) => void
  }
  kickVoteInProgress: boolean
}

const VoteKickContext = createContext<VoteKickContext | undefined>(undefined)

export const VoteKickProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useSocket()
  const { game, player } = useGame()
  const router = useRouter()
  const {
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
    showReport,
    showReportAgainstYou,
  } = useKickVoteToasts()

  const [kickVote, setKickVote] = useState<KickVoteToJson | null>(null)
  const kickVoteInProgress = kickVote !== null

  useEffect(() => {
    if (!game || !socket) return

    initKickVoteListeners()

    return destroyKickVoteListeners
  }, [socket, game, kickVote])

  //#region listeners
  const onKickVote = (kickVote: KickVoteToJson) => {
    setKickVote(kickVote)

    const isPlayerToKick = kickVote.targetId === player.id
    const hasVoted = kickVote.votes.find((v) => v.playerId === player.id)

    if (isPlayerToKick) showVoteAgainstYou(kickVote)
    else if (hasVoted) showVoteWithoutAction(kickVote)
    else showVoteWithAction(kickVote, voteToKick)
  }

  const onKickVoteFailed = (
    playerToKickId: string,
    playerToKickName: string,
  ) => {
    setKickVote(null)

    const isPlayerToKick = playerToKickId === player.id

    if (isPlayerToKick) showVoteAgainstYouFailed()
    else showVoteFailed(playerToKickName)
  }

  const onKickVoteSuccess = (
    playerToKickId: string,
    playerToKickName: string,
  ) => {
    setKickVote(null)
    const isPlayerToKick = playerToKickId === player.id

    console.log("onKickVoteSuccess", playerToKickId, player.id)

    if (isPlayerToKick) {
      showVoteAgainstYouSucceeded()
      router.replace("/")
    } else showVoteSucceeded(playerToKickName)
  }

  const onHostKick = (playerKickId: string, playerKickName: string) => {
    const isPlayerToKick = playerKickId === player.id

    if (isHost(game, playerKickId)) {
      showYouKickPlayer(playerKickName)
    } else if (isPlayerToKick) {
      showHostKickYou()
      router.replace("/")
    } else showHostKick(playerKickName)
  }

  const onReport = (playerToKickId: string, playerToKickName: string) => {
    if (playerToKickId === player.id) {
      showReportAgainstYou()
      router.replace("/")
    } else showReport(playerToKickName)
  }

  const initKickVoteListeners = () => {
    socket!.on("kick:vote", onKickVote)
    socket!.on("kick:vote-success", onKickVoteSuccess)
    socket!.on("kick:host-kick", onHostKick)
    socket!.on("kick:vote-failed", onKickVoteFailed)
    socket!.on("kick:report", onReport)
  }

  const destroyKickVoteListeners = () => {
    socket!.off("kick:vote", onKickVote)
    socket!.off("kick:vote-success", onKickVoteSuccess)
    socket!.off("kick:host-kick", onHostKick)
    socket!.off("kick:vote-failed", onKickVoteFailed)
    socket!.off("kick:report", onReport)
  }
  //#endregion

  //#region actions
  const initiateKickVote = (targetId: string) => {
    socket!.emit("kick:initiate-vote", { targetId })
    const playerToKick = game?.players.find((p) => p.socketId === targetId)
    if (!playerToKick) return

    showVoteInitiated(playerToKick.name)
  }

  const voteToKick = async (vote: boolean) => {
    socket!.emit("kick:vote", {
      vote,
    })
  }

  const actions = useMemo(
    () => ({
      initiateKickVote,
      voteToKick,
    }),
    [kickVote],
  )
  //#endregion

  const providerValue = useMemo(
    () => ({ kickVoteInProgress, actions }),
    [kickVoteInProgress, actions],
  )

  return (
    <VoteKickContext.Provider value={providerValue}>
      {children}
    </VoteKickContext.Provider>
  )
}

export const useVoteKick = () => {
  const context = useContext(VoteKickContext)
  if (context === undefined) {
    throw new Error("useVoteKick must be used within a VoteKickProvider")
  }
  return context
}
