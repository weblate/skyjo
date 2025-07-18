import type { Avatar, ConnectionStatus } from "../constants.js"
import type { CardRedisDb, CardToJson } from "./card.js"

export type PlayerScores = (number | "-")[]

export type PlayerToJson = {
  id: string
  name: string
  socketId: string
  avatar: Avatar
  score: number
  wantsReplay: boolean
  connectionStatus: ConnectionStatus
  scores: PlayerScores
  turnStartTime: number | null
  cards: CardToJson[][]
}

export type PlayerRedisDb = {
  id: string
  name: string
  avatar: Avatar
  socketId: string
  connectionStatus: ConnectionStatus
  score: number
  scores: PlayerScores
  wantsReplay: boolean
  hasPlayedLastTurn: boolean
  afkCount: number
  consecutiveAfkCount: number
  turnStartTime: number | null
  userId: number | null
  sessionId: string
  cards: CardRedisDb[][]
}
