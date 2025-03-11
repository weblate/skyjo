import { useSkyjo } from "@/contexts/SkyjoContext"
import { useSocket } from "@/contexts/SocketContext"
import { useKickVoteToasts } from "@/hooks/useKickVoteToasts"
import { useRouter } from "@/i18n/routing"
import { isAdmin } from "@/lib/skyjo"
import { KickVoteToJson } from "@skyjo/core"
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
  const { game, player } = useSkyjo()
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
    showAdminKick,
    showAdminKickYou,
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

  const onAdminKick = (playerKickId: string, playerKickName: string) => {
    const isPlayerToKick = playerKickId === player.id

    if (isAdmin(game, playerKickId)) {
      showYouKickPlayer(playerKickName)
    } else if (isPlayerToKick) {
      showAdminKickYou()
      router.replace("/")
    } else showAdminKick(playerKickName)
  }

  const initKickVoteListeners = () => {
    socket!.on("kick:vote", onKickVote)
    socket!.on("kick:vote-success", onKickVoteSuccess)
    socket!.on("kick:admin-kick", onAdminKick)
    socket!.on("kick:vote-failed", onKickVoteFailed)
  }

  const destroyKickVoteListeners = () => {
    socket!.off("kick:vote", onKickVote)
    socket!.off("kick:vote-success", onKickVoteSuccess)
    socket!.off("kick:admin-kick", onAdminKick)
    socket!.off("kick:vote-failed", onKickVoteFailed)
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
    if (!kickVote) return

    socket!.emit("kick:vote", {
      vote,
    })
  }

  const actions = {
    initiateKickVote,
    voteToKick,
  }
  //#endregion

  const providerValue = useMemo(() => ({ kickVoteInProgress, actions }), [])

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
