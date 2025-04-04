import type { KickVoteDb, KickVoteToJson, Vote } from "@/types/kickVote.js"
import { Constants } from "../constants.js"

export interface KickVoteConstructorParams {
  targetId: string
  initiatorId: string
  nbConnectedPlayers: number
  votes?: Vote[]
}

export class KickVote {
  targetId: string
  initiatorId: string
  private votes: Vote[]
  private readonly nbConnectedPlayers: number

  constructor({
    targetId,
    initiatorId,
    nbConnectedPlayers,
    votes = [{ playerId: initiatorId, vote: true }],
  }: KickVoteConstructorParams) {
    this.targetId = targetId
    this.initiatorId = initiatorId
    this.votes = votes
    this.nbConnectedPlayers = nbConnectedPlayers
  }

  addVote(playerId: string, vote: boolean) {
    this.votes.push({ playerId, vote })
  }

  hasPlayerVoted(playerId: string) {
    const vote = this.votes.find((v) => v.playerId === playerId)

    return !!vote
  }

  getRequiredVotes() {
    return Math.ceil(this.nbConnectedPlayers * Constants.KICK_VOTE_THRESHOLD)
  }

  hasReachedRequiredVotes() {
    const yesVotes = this.votes.filter((v) => v.vote).length

    return yesVotes >= this.getRequiredVotes()
  }

  allPlayersVotedExceptTarget() {
    return this.votes.length === this.nbConnectedPlayers - 1
  }

  toJson(): KickVoteToJson {
    return {
      targetId: this.targetId,
      initiatorId: this.initiatorId,
      votes: this.votes,
      requiredVotes: this.getRequiredVotes(),
    }
  }

  serialize(): KickVoteDb {
    return {
      targetId: this.targetId,
      initiatorId: this.initiatorId,
      votes: this.votes,
      nbConnectedPlayers: this.nbConnectedPlayers,
    }
  }
}
