import {
  type InitiateKickVote,
  initiateKickVote,
  type VoteToKick,
  voteToKick,
} from "@skymo/shared/validations"
import { socketErrorWrapper } from "@/realtime/utils/socketErrorWrapper.js"
import type { GameSocket } from "../types/gameSocket.js"
import { KickService } from "./kick.service.js"

const instance = new KickService()

export const kickRouter = (socket: GameSocket) => {
  socket.on(
    "kick:initiate-vote",
    socketErrorWrapper(async (data: InitiateKickVote) => {
      const { targetId } = initiateKickVote.parse(data)
      await instance.onInitiateKickVote(socket, targetId)
    }),
  )

  socket.on(
    "kick:vote",
    socketErrorWrapper(async (data: VoteToKick) => {
      const { vote } = voteToKick.parse(data)
      await instance.onVoteToKick(socket, vote)
    }),
  )
}
