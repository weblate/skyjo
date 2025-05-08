import type {
  ClientToServerEvents,
  ServerToClientEvents,
  SocketData,
} from "@skymo/shared/types"
import type { Socket } from "socket.io"

export type GameSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, unknown>,
  SocketData
>
