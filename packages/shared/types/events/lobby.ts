import type { CreatePlayer, GameStatus, JoinGame } from "@skymo/core"
import type { Error as ThrownError } from "@skymo/error"

export interface ClientToServerLobbyEvents {
  create: (player: CreatePlayer, isPrivate: boolean) => void
  join: (data: JoinGame) => void
  start: () => void
  "game:start-countdown": () => void
  "game:cancel-countdown": () => void
}

export type ErrorJoinMessage = Extract<
  ThrownError,
  "game-not-found" | "game-already-started" | "game-is-full" | "player-banned"
>

export interface ServerToClientLobbyEvents {
  "error:join": (message: ErrorJoinMessage) => void
  "game:join": (code: string, status: GameStatus, playerId: string) => void
  "game:countdown-started": (endTimestamp: number) => void
  "game:countdown-canceled": () => void
}
