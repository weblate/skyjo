import type { SessionDb, UserDb } from "@skymo/database/schema"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@skymo/shared/types"
import type { Socket } from "socket.io"

export interface SocketData {
  gameCode: string
  playerId: string
}

export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, unknown>,
  SocketData
> & {
  user?: UserDb
  session?: SessionDb
}
