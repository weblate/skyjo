import type { GameToJson, PlayerToJson, SettingsToJson } from "@skymo/core"
import type { GameOperation, GameUpdate, PlayerUpdate } from "./types.js"

const actions: Record<
  keyof GameOperation,
  (game: GameToJson, data: GameOperation[keyof GameOperation]) => void
> = {
  game: (game, data) => updateGameBasicFields(game, data as GameUpdate),
  settings: (game, data) =>
    updateSettings(game, data as Partial<SettingsToJson>),
  addPlayers: (game, data) => addPlayers(game, data as PlayerToJson[]),
  updatePlayers: (game, data) => updatePlayers(game, data as PlayerUpdate[]),
  removePlayers: (game, data) => removePlayers(game, data as string[]),
  reorderPlayers: (game, data) => reorderPlayers(game, data as string[]),
}

export const applyStateOperations = (
  game: GameToJson,
  operations: GameOperation,
): GameToJson => {
  // Create a deep copy to ensure immutability
  const gameUpdated = structuredClone(game)

  const keys = Object.keys(operations) as (keyof GameOperation)[]
  keys.forEach((key) => {
    const data = operations[key]
    if (!data) return

    actions[key](gameUpdated, data)
  })

  // clean up undefined cards - create new arrays to ensure immutability
  gameUpdated.players = gameUpdated.players.map((player) => ({
    ...player,
    cards: player.cards.map((row) => row.filter((card) => card !== undefined)),
  }))

  return gameUpdated
}

const updateGameBasicFields = (game: GameToJson, data: GameUpdate) => {
  Object.assign(game, data)
}

const updateSettings = (game: GameToJson, data: Partial<SettingsToJson>) => {
  // Create new settings object to ensure React detects change
  game.settings = { ...game.settings, ...data }
}

const addPlayers = (game: GameToJson, players: PlayerToJson[]) => {
  // Create new players array to ensure React detects change
  game.players = [...game.players, ...players]
}

const updatePlayers = (game: GameToJson, operations: PlayerUpdate[]) => {
  // Create new players array with new player objects to ensure React detects changes
  game.players = game.players.map((player) => {
    const update = operations.find((op) => op.id === player.id)
    if (!update) return player

    const { id: _id, ...rest } = update

    // If cards are being updated, ensure deep clone of nested arrays
    if (rest.cards) {
      return {
        ...player,
        ...rest,
        cards: rest.cards.map((column) => column.map((card) => ({ ...card }))),
      }
    }

    return { ...player, ...rest }
  })
}

const removePlayers = (game: GameToJson, playerIds: string[]) => {
  game.players = game.players.filter((player) => !playerIds.includes(player.id))
}

const reorderPlayers = (game: GameToJson, playerIds: string[]) => {
  const reorderedPlayers = playerIds
    .map((playerId) => game.players.find((player) => player.id === playerId))
    .filter((player): player is PlayerToJson => player !== undefined)

  game.players = reorderedPlayers
}
