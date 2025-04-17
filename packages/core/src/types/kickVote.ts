export type Vote = {
  playerId: string
  vote: boolean
}

export type KickVoteToJson = {
  targetId: string
  initiatorId: string
  votes: Vote[]
  requiredVotes: number
}

export type KickVoteDb = {
  targetId: string
  initiatorId: string
  votes: Vote[]
  nbConnectedPlayers: number
}
