import { KickVoteToJson, PlayerToJson } from "@skymo/core"
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"
import { useGame } from "@/contexts/GameContext"
import { useSocket } from "@/contexts/SocketContext"
import { useKickToasts } from "@/hooks/useKickToasts"
import { useRouter } from "@/i18n/routing"
import { isHost } from "@/lib/game"
import { clearLastGameCookie } from "@/utils/gameCookie"

interface KickContext {
  actions: {
    initiateKickVote: (targetPlayerId: string) => void
    voteToKick: (vote: boolean) => void
  }
  kickVoteStatus: "pending" | "success" | "failed" | null
  kickVoteInProgress: boolean
  kickVote: KickVoteToJson | null
  playerToKick: PlayerToJson | undefined
  isPlayerToKick: boolean
  playerVote: boolean | undefined
  hasVoted: boolean
  yesVotes: number
}

const KickContext = createContext<KickContext | undefined>(undefined)

export const KickProvider = ({ children }: PropsWithChildren) => {
  const { socket } = useSocket()
  const { game, player } = useGame()
  const router = useRouter()
  const {
    showVoteAgainstYouSucceeded,
    showYouKickPlayer,
    showHostKick,
    showHostKickYou,
  } = useKickToasts()

  const [kickVote, setKickVote] = useState<KickVoteToJson | null>(null)
  const [kickVoteStatus, setKickVoteStatus] = useState<
    "pending" | "success" | "failed" | null
  >(null)

  const playerToKick = useMemo(
    () => game?.players.find((p) => p.id === kickVote?.targetId),
    [kickVote],
  )
  const isPlayerToKick = useMemo(
    () => kickVote?.targetId === player?.id,
    [kickVote, player],
  )
  const playerVote = useMemo(
    () => kickVote?.votes.find((v) => v.playerId === player?.id)?.vote,
    [kickVote, player],
  )
  const yesVotes = kickVote?.votes.filter((v) => v.vote).length ?? 0

  useEffect(() => {
    if (!game || !socket) return

    initKickVoteListeners()

    return destroyKickVoteListeners
  }, [socket, game])

  const resetKickVote = () => {
    // kickVoteStatus is set to null to hide the vote
    setKickVoteStatus(null)

    // wait 1 second before resetting the vote to avoid bad UX
    setTimeout(() => {
      setKickVote(null)
    }, 1000)
  }

  //#region listeners
  const onKickVote = (kickVote: KickVoteToJson) => {
    setKickVote(kickVote)
    setKickVoteStatus("pending")
  }

  const onKickVoteFailed = () => {
    setKickVoteStatus("failed")

    setTimeout(resetKickVote, 5000)
  }

  const onKickVoteSuccess = (playerToKickId: string) => {
    setKickVoteStatus("success")

    setTimeout(resetKickVote, 5000)

    const isPlayerToKick = playerToKickId === player.id
    if (isPlayerToKick) {
      showVoteAgainstYouSucceeded()
      clearLastGameCookie()
      router.replace("/")
    }
  }

  const onKickVoteDismiss = () => {
    resetKickVote()
  }

  const onHostKick = (playerKickId: string, playerKickName: string) => {
    const isPlayerToKick = playerKickId === player.id

    if (isHost(game, playerKickId)) {
      showYouKickPlayer(playerKickName)
    } else if (isPlayerToKick) {
      showHostKickYou()
      router.replace("/")
    } else {
      showHostKick(playerKickName)
    }
  }

  const initKickVoteListeners = () => {
    socket!.on("kick:vote", onKickVote)
    socket!.on("kick:vote-success", onKickVoteSuccess)
    socket!.on("kick:vote-dismiss", onKickVoteDismiss)
    socket!.on("kick:host-kick", onHostKick)
    socket!.on("kick:vote-failed", onKickVoteFailed)
  }

  const destroyKickVoteListeners = () => {
    socket!.off("kick:vote", onKickVote)
    socket!.off("kick:vote-success", onKickVoteSuccess)
    socket!.off("kick:vote-dismiss", onKickVoteDismiss)
    socket!.off("kick:host-kick", onHostKick)
    socket!.off("kick:vote-failed", onKickVoteFailed)
  }
  //#endregion listeners

  //#region actions
  const initiateKickVote = (targetId: string) => {
    socket!.emit("kick:initiate-vote", { targetId })
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
    [],
  )
  //#endregion

  const providerValue = useMemo(
    () => ({
      actions,
      kickVote,
      kickVoteStatus,
      kickVoteInProgress: kickVoteStatus !== null,
      playerToKick,
      isPlayerToKick,
      playerVote,
      hasVoted: !!playerVote,
      yesVotes,
    }),
    [
      kickVoteStatus,
      actions,
      kickVote,
      playerToKick,
      isPlayerToKick,
      playerVote,
      yesVotes,
    ],
  )

  return (
    <KickContext.Provider value={providerValue}>
      {children}
    </KickContext.Provider>
  )
}

export const useKick = () => {
  const context = useContext(KickContext)
  if (context === undefined) {
    throw new Error("useKick must be used within a KickProvider")
  }
  return context
}
