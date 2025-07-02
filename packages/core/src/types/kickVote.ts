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

export interface KickVoteRedisDb {
  targetId: string
  initiatorId: string
  votes: Vote[]
  nbConnectedPlayers: number
}
