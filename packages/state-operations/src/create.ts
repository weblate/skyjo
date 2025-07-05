import type { GameToJson, PlayerToJson, SettingsToJson } from "@skymo/core"
import { isDeepStrictEqual } from "util"
import {
  type GameOperation,
  type GameUpdate,
  type PlayerUpdate,
} from "./types.js"

export const createStateOperations = (
  oldState: GameToJson,
  newState: GameToJson,
): GameOperation => {
  let ops: GameOperation = {}

  const basicFieldsChanges = compareBasicFields(oldState, newState)
  if (basicFieldsChanges) ops.game = basicFieldsChanges

  const settingsChanges = compareSettings(oldState.settings, newState.settings)
  if (settingsChanges) ops.settings = settingsChanges

  const playerOps = createPlayerOperations(oldState, newState)
  if (playerOps) ops = { ...ops, ...playerOps }

  if (Object.keys(ops).length > 0) {
    newState.stateVersion++
    ops.game = { ...ops.game, stateVersion: newState.stateVersion }
  }

  return ops
}

const compareBasicFields = (
  oldState: GameToJson,
  newState: GameToJson,
): GameUpdate | undefined => {
  let gameChanges: GameUpdate = {}

  const keys = Object.keys(oldState) as Array<keyof GameToJson>
  keys.forEach((key) => {
    if (key === "settings" || key === "players") return
    else if (!isDeepStrictEqual(oldState[key], newState[key])) {
      gameChanges = {
        ...gameChanges,
        [key]: newState[key],
      }
    }
  })

  const gameChangesKeys = Object.keys(gameChanges)

  const hasGameChanges = gameChangesKeys.length > 0
  const onlyUpdatedAtChange =
    gameChangesKeys.length === 1 && gameChangesKeys[0] === "updatedAt"

  if (hasGameChanges && !onlyUpdatedAtChange) {
    return gameChanges
  }
}

const compareSettings = (
  oldSettings: SettingsToJson,
  newSettings: SettingsToJson,
): Partial<SettingsToJson> | undefined => {
  let settingsChanges: Partial<SettingsToJson> = {}

  const keys = Object.keys(oldSettings) as Array<keyof SettingsToJson>
  keys.forEach((key) => {
    if (
      newSettings[key] !== undefined &&
      oldSettings[key] !== newSettings[key]
    ) {
      settingsChanges = {
        ...settingsChanges,
        [key]: newSettings[key],
      }
    }
  })

  if (Object.keys(settingsChanges).length > 0) {
    return settingsChanges
  }
}

const createPlayerOperations = (
  oldState: GameToJson,
  newState: GameToJson,
): Omit<GameOperation, "game" | "settings"> | undefined => {
  const ops: Omit<GameOperation, "game" | "settings"> = {}

  oldState.players.forEach((oldPlayer) => {
    const newPlayer = newState.players.find((p) => p.id === oldPlayer.id)
    if (!newPlayer) {
      ops.removePlayers ??= []
      ops.removePlayers.push(oldPlayer.id)
      return
    }
    const playerChanges = comparePlayer(oldPlayer, newPlayer)

    if (playerChanges) {
      ops.updatePlayers ??= []
      ops.updatePlayers.push(playerChanges)
    }
  })

  newState.players.slice(oldState.players.length).forEach((newPlayer) => {
    ops.addPlayers ??= []
    ops.addPlayers.push(newPlayer)
  })

  if (Object.keys(ops).length > 0) return ops
}

const comparePlayer = (
  oldPlayer: PlayerToJson,
  newPlayer: PlayerToJson,
): PlayerUpdate | undefined => {
  const playerId = oldPlayer.id
  let playerChanges: Partial<PlayerToJson> = {}

  const keys = Object.keys(oldPlayer) as Array<keyof PlayerToJson>
  keys.forEach((key) => {
    if (
      newPlayer[key] !== undefined &&
      !isDeepStrictEqual(oldPlayer[key], newPlayer[key])
    ) {
      playerChanges = {
        ...playerChanges,
        [key]: newPlayer[key],
      }
    }
  })

  if (Object.keys(playerChanges).length > 0) {
    return { ...playerChanges, id: playerId }
  }
}
