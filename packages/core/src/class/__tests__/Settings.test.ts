import { beforeEach, describe, expect, it } from "vitest"
import { Constants } from "../../constants.js"
import type { GameRedisDb } from "../../types/game.js"
import { Settings } from "../Settings.js"

let settings: Settings

describe("Settings", () => {
  beforeEach(() => {
    settings = new Settings()
  })

  it("should return default settings", () => {
    const defaultSettings = new Settings()

    expect(defaultSettings.isConfirmed).toBeFalsy()
    expect(defaultSettings.private).toBeFalsy()
    expect(defaultSettings.removeIdenticalColumn).toBe(
      Constants.DEFAULT_GAME_SETTINGS.REMOVE_IDENTICAL_COLUMN,
    )
    expect(defaultSettings.removeIdenticalRow).toBe(
      Constants.DEFAULT_GAME_SETTINGS.REMOVE_IDENTICAL_ROW,
    )
    expect(defaultSettings.initialTurnedCount).toBe(
      Constants.DEFAULT_GAME_SETTINGS.CARDS.INITIAL_TURNED_COUNT,
    )
    expect(defaultSettings.cardPerRow).toBe(
      Constants.DEFAULT_GAME_SETTINGS.CARDS.PER_ROW,
    )
    expect(defaultSettings.cardPerColumn).toBe(
      Constants.DEFAULT_GAME_SETTINGS.CARDS.PER_COLUMN,
    )
    expect(defaultSettings.maxPlayers).toBe(
      Constants.DEFAULT_GAME_SETTINGS.MAX_PLAYERS,
    )
    expect(defaultSettings.showCurrentScore).toBe(
      Constants.DEFAULT_GAME_SETTINGS.SHOW_CURRENT_SCORE,
    )
    expect(defaultSettings.playerRearrangement).toBe(
      Constants.DEFAULT_GAME_SETTINGS.PLAYER_REARRANGEMENT,
    )
  })

  it("should have the settings validation to true by default for private game", () => {
    const defaultSettings = new Settings(true)

    expect(defaultSettings.isConfirmed).toBeTruthy()
  })

  it("should populate the class", () => {
    const dbGameSettings: GameRedisDb["settings"] = {
      isConfirmed: true,
      removeIdenticalColumn: false,
      removeIdenticalRow: false,
      initialTurnedCount: 4,
      cardPerRow: 3,
      cardPerColumn: 4,
      scoreToEndGame: 101,
      firstPlayerMultiplierPenalty: 1,
      firstPlayerPenaltyType:
        Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY,
      firstPlayerFlatPenalty: 0,
      maxPlayers: 2,
      private: true,
      showCurrentScore: true,
      playerRearrangement: Constants.PLAYER_REARRANGEMENT.NEVER,
    }

    const settings = new Settings(false).populate(dbGameSettings)

    expect(structuredClone(settings)).toStrictEqual(dbGameSettings)
  })

  it("should update settings", () => {
    const newSettings = {
      isConfirmed: true,
      private: true,
      removeIdenticalColumn: true,
      removeIdenticalRow: true,
      initialTurnedCount: 2,
      cardPerRow: 6,
      cardPerColumn: 8,
      scoreToEndGame: 100,
      firstPlayerMultiplierPenalty: 2,
      showCurrentScore: true,
      playerRearrangement: Constants.PLAYER_REARRANGEMENT.EVERY_ROUND,
    }

    settings.updateSettings(newSettings)

    expect(settings.removeIdenticalColumn).toBeTruthy()
    expect(settings.removeIdenticalRow).toBeTruthy()
    expect(settings.initialTurnedCount).toBe(2)
    expect(settings.cardPerRow).toBe(6)
    expect(settings.cardPerColumn).toBe(8)
    expect(settings.scoreToEndGame).toBe(100)
    expect(settings.firstPlayerMultiplierPenalty).toBe(2)
    expect(settings.showCurrentScore).toBeTruthy()
    expect(settings.playerRearrangement).toBe(Constants.PLAYER_REARRANGEMENT.EVERY_ROUND)
  })

  describe("preventInvalidSettings", () => {
    it("should prevent invalid settings when initialTurnedCount is greater the number of cards on the board", () => {
      settings.cardPerColumn = 4
      settings.cardPerRow = 3
      settings.initialTurnedCount = 14
      settings.preventInvalidSettings()

      expect(settings.initialTurnedCount).toBe(11)
    })

    it("should prevent invalid settings when initialTurnedCount is equal to the number of cards on the board", () => {
      settings.cardPerColumn = 4
      settings.cardPerRow = 3
      settings.initialTurnedCount = 12
      settings.preventInvalidSettings()

      expect(settings.initialTurnedCount).toBe(11)
    })

    it("should prevent invalid settings when cardPerColumn and cardPerRow are both 1", () => {
      settings.cardPerColumn = 1
      settings.cardPerRow = 1
      settings.preventInvalidSettings()

      expect(settings.cardPerColumn).toBe(2)
    })

    it("should prevent invalid settings when firstPlayerFlatPenalty is greater than scoreToEndGame", () => {
      settings.firstPlayerFlatPenalty = 101
      settings.scoreToEndGame = 80
      settings.preventInvalidSettings()

      expect(settings.firstPlayerFlatPenalty).toBe(settings.scoreToEndGame)
    })
  })

  describe("isClassicSettings", () => {
    it("should return true if the settings are classic", () => {
      const settings = new Settings()

      expect(settings.isClassicSettings()).toBeTruthy()
    })

    it("should return false if the settings are not classic", () => {
      const settings = new Settings()
      settings.removeIdenticalRow = true

      expect(settings.isClassicSettings()).toBeFalsy()
    })
  })

  it("should return json", () => {
    const settingsToJson = settings.toJson()

    expect(settingsToJson).toStrictEqual({
      isConfirmed: false,
      private: false,
      removeIdenticalColumn: true,
      removeIdenticalRow: false,
      initialTurnedCount: 2,
      cardPerRow: 3,
      cardPerColumn: 4,
      maxPlayers: 8,
      scoreToEndGame: 100,
      firstPlayerMultiplierPenalty: 2,
      firstPlayerPenaltyType:
        Constants.FIRST_PLAYER_PENALTY_TYPE.MULTIPLIER_ONLY,
      firstPlayerFlatPenalty: 0,
      showCurrentScore: false,
      playerRearrangement: Constants.PLAYER_REARRANGEMENT.NEVER,
    })
  })

  describe("constructor", () => {
    it("should create settings with default values", () => {
      const settings = new Settings()

      expect(settings.private).toBe(false)
      expect(settings.isConfirmed).toBe(false)
      expect(settings.maxPlayers).toBe(
        Constants.DEFAULT_GAME_SETTINGS.MAX_PLAYERS,
      )
    })

    it("should create settings with private game", () => {
      const settings = new Settings(true)

      expect(settings.private).toBe(true)
      expect(settings.isConfirmed).toBe(true)
    })

    it("should create settings with custom maxPlayers", () => {
      const customMaxPlayers = 4
      const settings = new Settings(false, customMaxPlayers)

      expect(settings.private).toBe(false)
      expect(settings.maxPlayers).toBe(customMaxPlayers)
    })
  })
})
