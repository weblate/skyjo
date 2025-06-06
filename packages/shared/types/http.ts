import type { Game, PlayerToJson, PublicGameTag } from "@skymo/core"

export interface PublicGame extends Pick<Game, "code"> {
  hostName: string
  maxPlayers: number
  players: Pick<PlayerToJson, "name" | "avatar" | "id">[]
  tags: PublicGameTag[]
}
