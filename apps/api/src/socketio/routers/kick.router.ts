import { KickService } from "@/socketio/services/kick.service.js"
import { socketErrorWrapper } from "@/socketio/utils/socketErrorWrapper.js"
import {
  type InitiateKickVote,
  type VoteToKick,
  initiateKickVote,
  voteToKick,
} from "@skymo/shared/validations"
import type { GameSocket } from "../types/gameSocket.js"

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
