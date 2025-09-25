import type { GameToJson, PlayerToJson, SettingsToJson } from "@skymo/core"

export type GameUpdate = Omit<Partial<GameToJson>, "settings" | "players">

export type PlayerUpdate = Partial<PlayerToJson> & {
  id: string
}
export type GameOperation = {
  game?: GameUpdate
  settings?: Partial<SettingsToJson>
  addPlayers?: PlayerToJson[]
  updatePlayers?: PlayerUpdate[]
  removePlayers?: string[]
  reorderPlayers?: string[]
}
