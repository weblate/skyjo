import type { Game, PlayerToJson } from "@skymo/core"

export type PublicGameTag =
  | "classic"
  | "column"
  | "row"
  | "short-game"
  | "long-game"

export type PublicGame = Pick<Game, "code"> & {
  hostName: string
  maxPlayers: number
  players: Pick<PlayerToJson, "name" | "avatar" | "id">[]
  tags: PublicGameTag[]
}
