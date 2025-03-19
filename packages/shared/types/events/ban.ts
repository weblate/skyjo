import type { BanError } from "@skymo/error"
import type { BanPlayer } from "@skymo/shared/validations"

export interface ClientToServerBanEvents {
  "ban:player": (data: BanPlayer) => void
}

export interface ServerToClientBanEvents {
  "ban:player-banned": (playerId: string, playerName: string) => void
  "ban:error": (code: BanError) => void
}
