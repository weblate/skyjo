import { Server as HttpServer } from "http"
import type { SkyjoSocket } from "@/socketio/types/skyjoSocket.js"
import { ENV } from "@env"
import type { Skyjo } from "@skyjo/core"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@skyjo/shared/types"
import { Server } from "socket.io"
import customParser from "socket.io-msgpack-parser"

export class SocketManager {
  private static instance: SocketManager
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager()
    }
    return SocketManager.instance
  }

  setIO(server: HttpServer): void {
    if (this.io) return

    const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      parser: customParser,
      transports: ["polling", "websocket"],
      cors: {
        origin: ENV.ORIGINS,
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 120000,
      },
    })

    this.io = io
  }

  getIO(): Server<ClientToServerEvents, ServerToClientEvents> {
    if (!this.io) {
      throw new Error("Socket.IO server not initialized")
    }
    return this.io
  }

  isInitialized(): boolean {
    return this.io !== null
  }

  getSocket(playerId: string): SkyjoSocket | undefined {
    const io = this.getIO()

    return io.sockets.sockets.get(playerId)
  }

  sendToSocket<T extends keyof ServerToClientEvents>(
    socket: SkyjoSocket,
    params: {
      event: T
      data: Parameters<ServerToClientEvents[T]>
    },
  ) {
    socket.emit(params.event, ...params.data)
  }
  sendToRoom<T extends keyof ServerToClientEvents>(params: {
    room: string
    event: T
    data: Parameters<ServerToClientEvents[T]>
  }) {
    const io = this.getIO()
    io.to(params.room).emit(params.event, ...params.data)
  }

  sendGameToSocket(socketId: string, game: Skyjo) {
    const io = this.getIO()
    io.to(socketId).emit("game", game.toJson())
  }
}
