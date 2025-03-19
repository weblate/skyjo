import type { Avatar, ConnectionStatus } from "@/constants.js"
import type { CardToJson } from "./card.js"

export type PlayerScores = (number | "-")[]

export type PlayerToJson = {
  id: string
  name: string
  socketId: string
  avatar: Avatar
  turnStartTime: Date | null
  wantsReplay: boolean
  connectionStatus: ConnectionStatus
  score: number
  scores: PlayerScores
  cards: CardToJson[][]
}
