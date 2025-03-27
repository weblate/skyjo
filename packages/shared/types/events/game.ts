import type {
  GameToJson,
  PlayPickCard,
  PlayReplaceCard,
  PlayRevealCard,
  PlayTurnCard,
} from "@skymo/core"
import type { GameOperation } from "@skymo/state-operations"

export type SocketAck = (result: boolean) => void

export interface ClientToServerGameEvents {
  get: (stateVersion: number | null, firstTime?: boolean) => void
  "play:reveal-card": (
    data: PlayRevealCard,
    stateVersion: number,
    ack: SocketAck,
  ) => void
  "play:pick-card": (
    data: PlayPickCard,
    stateVersion: number,
    ack: SocketAck,
  ) => void
  "play:replace-card": (
    data: PlayReplaceCard,
    stateVersion: number,
    ack: SocketAck,
  ) => void
  "play:discard-selected-card": (stateVersion: number, ack: SocketAck) => void
  "play:turn-card": (
    data: PlayTurnCard,
    stateVersion: number,
    ack: SocketAck,
  ) => void
  replay: (stateVersion: number) => void
}

export type ClientToServerGameWithAckEvents = Omit<
  ClientToServerGameEvents,
  "get" | "replay"
>

export interface ServerToClientGameEvents {
  game: (game: GameToJson) => void
  "game:update": (operations: GameOperation) => void
  "game:fix": (operations: GameOperation[]) => void
}
