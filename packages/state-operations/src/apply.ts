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
}

export const applyStateOperations = (
  game: GameToJson,
  operations: GameOperation,
): GameToJson => {
  const gameUpdated = game

  const keys = Object.keys(operations) as (keyof GameOperation)[]
  keys.forEach((key) => {
    const data = operations[key]
    if (!data) return

    actions[key](gameUpdated, data)
  })

  // clean up undefined cards
  gameUpdated.players.forEach((player) => {
    player.cards = player.cards.map((row) =>
      row.filter((card) => card !== undefined),
    )
  })

  return gameUpdated
}

const updateGameBasicFields = (game: GameToJson, data: GameUpdate) => {
  Object.assign(game, data)
}

const updateSettings = (game: GameToJson, data: Partial<SettingsToJson>) => {
  Object.assign(game.settings, data)
}

const addPlayers = (game: GameToJson, players: PlayerToJson[]) => {
  game.players.push(...players)
}

const updatePlayers = (game: GameToJson, operations: PlayerUpdate[]) => {
  operations.forEach(({ id, ...rest }) => {
    const playerIndex = game.players.findIndex((p) => p.id === id)
    if (playerIndex === -1) return

    game.players[playerIndex] = Object.assign(game.players[playerIndex], rest)
  })
}

const removePlayers = (game: GameToJson, playerIds: string[]) => {
  game.players = game.players.filter((player) => !playerIds.includes(player.id))
}
