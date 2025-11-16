import type {
  GameStatus,
  LastTurnStatus,
  RoundPhase,
  TurnStatus,
} from "@/constants.js"
import type { PlayerRedisDb, PlayerToJson } from "./player.js"
import type { SettingsRedisDb, SettingsToJson } from "./settings.js"

export interface GameToJson {
  code: string
  status: GameStatus
  hostId: string
  players: PlayerToJson[]
  currentPlayerId: string
  settings: SettingsToJson
  selectedCardValue: number | null
  roundPhase: RoundPhase
  turnStatus: TurnStatus
  lastDiscardCardValue?: number
  lastTurnStatus: LastTurnStatus
  stateVersion: number
  updatedAt: Date
}

export interface GameRedisDb {
  id: string
  code: string
  hostId: string
  isFull: boolean
  status: GameStatus
  players: PlayerRedisDb[]
  currentPlayerId: string
  discardPile: number[]
  drawPile: number[]
  settings: SettingsRedisDb
  selectedCardValue: number | null
  roundNumber: number
  roundPhase: RoundPhase
  turnStatus: TurnStatus
  lastTurnStatus: LastTurnStatus
  firstToFinishPlayerId: string | null
  bannedUserIds?: number[]
  bannedGuestIds?: string[]
  gameStartedAt: Date | null
  roundStartedAt: Date | null
  stateVersion: number
  createdAt: Date
  updatedAt: Date
  processingAfk: boolean
}
