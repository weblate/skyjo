import type { Settings } from "@/class/Settings.js"
import { Constants } from "../constants.js"
import type { PublicGameTag, SettingsRedisDb } from "../types/settings.js"

export const isGameClassicSettings = (settings: SettingsRedisDb | Settings) => {
  return (
    settings.removeIdenticalColumn ===
      Constants.DEFAULT_GAME_SETTINGS.REMOVE_IDENTICAL_COLUMN &&
    settings.removeIdenticalRow ===
      Constants.DEFAULT_GAME_SETTINGS.REMOVE_IDENTICAL_ROW &&
    settings.initialTurnedCount ===
      Constants.DEFAULT_GAME_SETTINGS.CARDS.INITIAL_TURNED_COUNT &&
    settings.cardPerRow === Constants.DEFAULT_GAME_SETTINGS.CARDS.PER_ROW &&
    settings.cardPerColumn ===
      Constants.DEFAULT_GAME_SETTINGS.CARDS.PER_COLUMN &&
    settings.scoreToEndGame ===
      Constants.DEFAULT_GAME_SETTINGS.SCORE_TO_END_GAME &&
    settings.firstPlayerMultiplierPenalty ===
      Constants.DEFAULT_GAME_SETTINGS.FIRST_PLAYER_MULTIPLIER_PENALTY &&
    settings.firstPlayerPenaltyType ===
      Constants.DEFAULT_GAME_SETTINGS.FIRST_PLAYER_PENALTY_TYPE &&
    settings.showCurrentScore ===
      Constants.DEFAULT_GAME_SETTINGS.SHOW_CURRENT_SCORE
  )
}

export const constructTagArray = (settings: Settings | SettingsRedisDb) => {
  const tags: PublicGameTag[] = []

  if (isGameClassicSettings(settings)) tags.push("classic")
  if (settings.removeIdenticalRow) tags.push("row")
  if (settings.removeIdenticalColumn) tags.push("column")
  if (settings.scoreToEndGame > 100) tags.push("long-game")
  if (settings.scoreToEndGame < 100) tags.push("short-game")

  return tags
}
