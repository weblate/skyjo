import type { Error as ThrownError } from "@skymo/error"
import type { LastGame } from "@/validations/reconnect.js"
export interface ClientToServerPlayerEvents {
  reconnect: (data: LastGame) => void
  leave: () => void
  forfeit: () => void
  disconnect: () => void
  recover: () => void
}

export type ErrorReconnectMessage = Extract<ThrownError, "cannot-reconnect">
export type ErrorRecoverMessage = Extract<ThrownError, "game-not-found">

export interface ServerToClientPlayerEvents {
  "error:reconnect": (message: ErrorReconnectMessage) => void
  "error:recover": (message: ErrorRecoverMessage) => void
  "leave:success": () => void
  "forfeit:success": () => void
}
