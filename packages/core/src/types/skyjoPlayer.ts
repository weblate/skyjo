import type { Avatar, ConnectionStatus } from "@/constants.js"
import type { SkyjoCardToJson } from "./skyjoCard.js"

export type SkyjoPlayerScores = (number | "-")[]

export type SkyjoPlayerToJson = {
  id: string
  name: string
  socketId: string
  avatar: Avatar
  turnStartTime: Date | null
  wantsReplay: boolean
  connectionStatus: ConnectionStatus
  score: number
  scores: SkyjoPlayerScores
  cards: SkyjoCardToJson[][]
}
