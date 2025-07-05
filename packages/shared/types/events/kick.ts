import type { KickVoteToJson } from "@skymo/core"
import type { InitiateKickVote, VoteToKick } from "@/validations/kick.js"

export interface ClientToServerKickEvents {
  "kick:initiate-vote": (data: InitiateKickVote) => void
  "kick:vote": (data: VoteToKick) => void
}

export interface ServerToClientKickEvents {
  "kick:vote": (data: KickVoteToJson) => void
  "kick:vote-success": (playerToKickId: string) => void
  "kick:vote-failed": () => void
  "kick:vote-dismiss": () => void
  "kick:host-kick": (playerToKickId: string, playerToKickName: string) => void

  "kick:report": (playerToKickId: string, playerToKickName: string) => void
}
