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
