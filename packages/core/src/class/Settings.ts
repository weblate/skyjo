import type { GameDb } from "@/types/game.js"
import type { SettingsToJson } from "@/types/settings.js"
import { Constants, type FirstPlayerPenaltyType } from "../constants.js"

type UpdateSettings = {
  maxPlayers?: number
  removeIdenticalColumn?: boolean
  removeIdenticalRow?: boolean
  initialTurnedCount?: number
  cardPerRow?: number
  cardPerColumn?: number
  scoreToEndGame?: number
  firstPlayerMultiplierPenalty?: number
  firstPlayerFlatPenalty?: number
  firstPlayerPenaltyType?: FirstPlayerPenaltyType
  showCurrentScore?: boolean
}

export interface SettingsInterface {
  private: boolean
  maxPlayers: number
  removeIdenticalColumn: boolean
  removeIdenticalRow: boolean
  initialTurnedCount: number
  cardPerRow: number
  cardPerColumn: number

  updateSettings(settings: UpdateSettings): void
  preventInvalidSettings(): void
  toJson(): SettingsToJson
}

export class Settings implements SettingsInterface {
  isConfirmed: boolean = false
  private: boolean = false
  maxPlayers: number = Constants.DEFAULT_GAME_SETTINGS.MAX_PLAYERS
  removeIdenticalColumn: boolean =
    Constants.DEFAULT_GAME_SETTINGS.REMOVE_IDENTICAL_COLUMN
  removeIdenticalRow: boolean =
    Constants.DEFAULT_GAME_SETTINGS.REMOVE_IDENTICAL_ROW
  initialTurnedCount: number =
    Constants.DEFAULT_GAME_SETTINGS.CARDS.INITIAL_TURNED_COUNT
  cardPerRow: number = Constants.DEFAULT_GAME_SETTINGS.CARDS.PER_ROW
  cardPerColumn: number = Constants.DEFAULT_GAME_SETTINGS.CARDS.PER_COLUMN
  scoreToEndGame: number = Constants.DEFAULT_GAME_SETTINGS.SCORE_TO_END_GAME
  firstPlayerMultiplierPenalty: number =
    Constants.DEFAULT_GAME_SETTINGS.FIRST_PLAYER_MULTIPLIER_PENALTY
  firstPlayerFlatPenalty: number =
    Constants.DEFAULT_GAME_SETTINGS.FIRST_PLAYER_FLAT_PENALTY
  firstPlayerPenaltyType: FirstPlayerPenaltyType =
    Constants.DEFAULT_GAME_SETTINGS.FIRST_PLAYER_PENALTY_TYPE
  showCurrentScore: boolean = Constants.DEFAULT_GAME_SETTINGS.SHOW_CURRENT_SCORE

  constructor(isPrivate: boolean = false, maxPlayers?: number) {
    this.private = isPrivate
    if (isPrivate) this.isConfirmed = true
    if (maxPlayers) this.maxPlayers = maxPlayers
  }

  populate(settings: GameDb["settings"]) {
    this.isConfirmed = settings.isConfirmed
    this.private = settings.private
    this.maxPlayers = settings.maxPlayers
    this.removeIdenticalColumn = settings.removeIdenticalColumn
    this.removeIdenticalRow = settings.removeIdenticalRow
    this.initialTurnedCount = settings.initialTurnedCount
    this.cardPerRow = settings.cardPerRow
    this.cardPerColumn = settings.cardPerColumn
    this.scoreToEndGame = settings.scoreToEndGame
    this.firstPlayerMultiplierPenalty = settings.firstPlayerMultiplierPenalty
    this.firstPlayerFlatPenalty = settings.firstPlayerFlatPenalty
    this.firstPlayerPenaltyType = settings.firstPlayerPenaltyType
    this.showCurrentScore = settings.showCurrentScore

    return this
  }

  /* istanbul ignore next --@preserve */
  updateSettings(settings: UpdateSettings) {
    this.maxPlayers = settings.maxPlayers ?? this.maxPlayers
    this.removeIdenticalColumn =
      settings.removeIdenticalColumn ?? this.removeIdenticalColumn
    this.removeIdenticalRow =
      settings.removeIdenticalRow ?? this.removeIdenticalRow
    this.initialTurnedCount =
      settings.initialTurnedCount ?? this.initialTurnedCount
    this.cardPerRow = settings.cardPerRow ?? this.cardPerRow
    this.cardPerColumn = settings.cardPerColumn ?? this.cardPerColumn
    this.scoreToEndGame = settings.scoreToEndGame ?? this.scoreToEndGame
    this.firstPlayerMultiplierPenalty =
      settings.firstPlayerMultiplierPenalty ?? this.firstPlayerMultiplierPenalty
    this.firstPlayerFlatPenalty =
      settings.firstPlayerFlatPenalty ?? this.firstPlayerFlatPenalty
    this.firstPlayerPenaltyType =
      settings.firstPlayerPenaltyType ?? this.firstPlayerPenaltyType
    this.showCurrentScore = settings.showCurrentScore ?? this.showCurrentScore

    this.preventInvalidSettings()
  }

  preventInvalidSettings() {
    if (this.cardPerColumn * this.cardPerRow <= this.initialTurnedCount) {
      this.initialTurnedCount = this.cardPerColumn * this.cardPerRow - 1
    }

    if (this.cardPerColumn === 1 && this.cardPerRow === 1) {
      this.cardPerColumn = 2
    }

    if (this.firstPlayerFlatPenalty > this.scoreToEndGame) {
      this.firstPlayerFlatPenalty = this.scoreToEndGame
    }
  }

  isClassicSettings() {
    return (
      this.removeIdenticalColumn ===
        Constants.DEFAULT_GAME_SETTINGS.REMOVE_IDENTICAL_COLUMN &&
      this.removeIdenticalRow ===
        Constants.DEFAULT_GAME_SETTINGS.REMOVE_IDENTICAL_ROW &&
      this.initialTurnedCount ===
        Constants.DEFAULT_GAME_SETTINGS.CARDS.INITIAL_TURNED_COUNT &&
      this.cardPerRow === Constants.DEFAULT_GAME_SETTINGS.CARDS.PER_ROW &&
      this.cardPerColumn === Constants.DEFAULT_GAME_SETTINGS.CARDS.PER_COLUMN &&
      this.scoreToEndGame ===
        Constants.DEFAULT_GAME_SETTINGS.SCORE_TO_END_GAME &&
      this.firstPlayerMultiplierPenalty ===
        Constants.DEFAULT_GAME_SETTINGS.FIRST_PLAYER_MULTIPLIER_PENALTY &&
      this.firstPlayerPenaltyType ===
        Constants.DEFAULT_GAME_SETTINGS.FIRST_PLAYER_PENALTY_TYPE &&
      this.showCurrentScore ===
        Constants.DEFAULT_GAME_SETTINGS.SHOW_CURRENT_SCORE
    )
  }

  toJson() {
    return {
      isConfirmed: this.isConfirmed,
      private: this.private,
      maxPlayers: this.maxPlayers,
      removeIdenticalColumn: this.removeIdenticalColumn,
      removeIdenticalRow: this.removeIdenticalRow,
      initialTurnedCount: this.initialTurnedCount,
      cardPerRow: this.cardPerRow,
      cardPerColumn: this.cardPerColumn,
      scoreToEndGame: this.scoreToEndGame,
      firstPlayerMultiplierPenalty: this.firstPlayerMultiplierPenalty,
      firstPlayerFlatPenalty: this.firstPlayerFlatPenalty,
      firstPlayerPenaltyType: this.firstPlayerPenaltyType,
      showCurrentScore: this.showCurrentScore,
    } satisfies SettingsToJson
  }
}
