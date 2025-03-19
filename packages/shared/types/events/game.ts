import type {
  GameToJson,
  PlayPickCard,
  PlayReplaceCard,
  PlayRevealCard,
  PlayTurnCard,
} from "@skymo/core"
import type { GameOperation } from "@skymo/state-operations"

export interface ClientToServerGameEvents {
  get: (stateVersion: number | null, firstTime?: boolean) => void
  "play:reveal-card": (data: PlayRevealCard, stateVersion: number) => void
  "play:pick-card": (data: PlayPickCard, stateVersion: number) => void
  "play:replace-card": (data: PlayReplaceCard, stateVersion: number) => void
  "play:discard-selected-card": (stateVersion: number) => void
  "play:turn-card": (data: PlayTurnCard, stateVersion: number) => void
  replay: (stateVersion: number) => void
}

export interface ServerToClientGameEvents {
  game: (game: GameToJson) => void
  "game:update": (operations: GameOperation) => void
  "game:fix": (operations: GameOperation[]) => void
}
