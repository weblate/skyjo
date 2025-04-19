import type {
  Avatar,
  ConnectionStatus,
  FirstPlayerPenaltyType,
  GameStatus,
  LastTurnStatus,
  RoundPhase,
  TurnStatus,
} from "@/constants.js"
import type { PlayerScores, PlayerToJson } from "./player.js"
import type { SettingsToJson } from "./settings.js"

export interface GameToJson {
  code: string
  status: GameStatus
  hostId: string
  players: PlayerToJson[]
  turn: number
  settings: SettingsToJson
  selectedCardValue: number | null
  roundPhase: RoundPhase
  turnStatus: TurnStatus
  lastDiscardCardValue?: number
  lastTurnStatus: LastTurnStatus
  stateVersion: number
  updatedAt: Date
}

export interface GameDb {
  id: string
  code: string
  hostId: string
  isFull: boolean
  status: GameStatus
  players: {
    id: string
    name: string
    socketId: string
    avatar: Avatar
    score: number
    wantsReplay: boolean
    connectionStatus: ConnectionStatus
    scores: PlayerScores
    hasPlayedLastTurn: boolean
    afkCount: number
    consecutiveAfkCount: number
    turnStartTime: Date | null
    cards: Array<
      Array<{
        id: string
        value: number
        isVisible: boolean
      }>
    >
  }[]
  turn: number
  discardPile: number[]
  drawPile: number[]
  settings: {
    isConfirmed: boolean
    private: boolean
    maxPlayers: number
    removeIdenticalColumn: boolean
    removeIdenticalRow: boolean
    initialTurnedCount: number
    cardPerRow: number
    cardPerColumn: number
    scoreToEndGame: number
    firstPlayerMultiplierPenalty: number
    firstPlayerPenaltyType: FirstPlayerPenaltyType
    firstPlayerFlatPenalty: number
    showCurrentScore: boolean
  }
  selectedCardValue: number | null
  roundNumber: number
  roundPhase: RoundPhase
  turnStatus: TurnStatus
  lastTurnStatus: LastTurnStatus
  firstToFinishPlayerId: string | null
  bannedPlayerIds: string[]
  bannedUsernames: string[]
  stateVersion: number
  createdAt: Date
  updatedAt: Date
  processingAfk: boolean
}
