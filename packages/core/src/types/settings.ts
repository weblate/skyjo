import type { FirstPlayerPenaltyType } from "@/constants.js"

export type SettingsToJson = {
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
  firstPlayerFlatPenalty: number
  firstPlayerPenaltyType: FirstPlayerPenaltyType
  showCurrentScore: boolean
}

export interface SettingsRedisDb {
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

export type PublicGameTag =
  | "classic"
  | "column"
  | "row"
  | "short-game"
  | "long-game"
