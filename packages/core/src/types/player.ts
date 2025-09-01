import type { Avatar, ConnectionStatus } from "../constants.js"
import type { CardRedisDb, CardToJson } from "./card.js"

export type PenaltyScore = {
  score: number
  penalty?: number
  originalScore?: number
}

export type PlayerScore = "-" | number | PenaltyScore

export type PlayerToJson = {
  id: string
  name: string
  socketId: string
  avatar: Avatar
  score: number
  wantsReplay: boolean
  connectionStatus: ConnectionStatus
  scores: PlayerScore[]
  turnStartTime: number | null
  cards: CardToJson[][]
  username?: string
  userId?: number | null
  guestId?: string | null
  forfeited: boolean
  forfeitedAt: number | null
  hasRevealedCardCount: boolean
}

export type PlayerRedisDb = {
  id: string
  name: string
  avatar: Avatar
  socketId: string
  username?: string | null
  guestId?: string | null
  connectionStatus: ConnectionStatus
  score: number
  scores: PlayerScore[]
  wantsReplay: boolean
  hasPlayedLastTurn: boolean
  afkCount: number
  consecutiveAfkCount: number
  turnStartTime: number | null
  userId: number | null
  sessionId: string
  cards: CardRedisDb[][]
  forfeited: boolean
  forfeitedAt: number | null
  hasRevealedCardCount: boolean
}
