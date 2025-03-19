import { Server as HttpServer } from "http"
import type { GameSocket } from "@/socketio/types/gameSocket.js"
import { ENV } from "@env"
import type { Game } from "@skymo/core"
import { Logger } from "@skymo/logger"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@skymo/shared/types"
import { createAdapter } from "@socket.io/redis-adapter"
import dayjs from "dayjs"
import { createClient } from "redis"
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

    // Create Redis clients for the adapter
    const pubClient = createClient({ url: ENV.REDIS_URL })
    const subClient = pubClient.duplicate()

    // Handle Redis client errors
    pubClient.on("error", (err) => {
      Logger.error("Redis Pub Client Error", { error: err })
    })

    subClient.on("error", (err) => {
      Logger.error("Redis Sub Client Error", { error: err })
    })

    // Connect to Redis
    Promise.all([pubClient.connect(), subClient.connect()])
      .then(() => {
        Logger.info("Redis clients connected for Socket.IO adapter")
      })
      .catch((err) => {
        Logger.error("Failed to connect Redis clients for Socket.IO adapter", {
          error: err,
        })
      })

    const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
      parser: customParser,
      transports: ["polling", "websocket"],
      cors: {
        origin: ENV.ORIGINS,
        credentials: true,
      },
      connectionStateRecovery: {
        maxDisconnectionDuration: 300000,
        skipMiddlewares: false,
      },
      pingTimeout: 20000,
      pingInterval: 25000,
      cookie: {
        name: "skymo-io",
        httpOnly: true,
        sameSite: "strict",
        expires: dayjs().add(1, "day").toDate(),
      },
      adapter: createAdapter(pubClient, subClient),
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

  getSocket(playerId: string): GameSocket | undefined {
    const io = this.getIO()

    return io.sockets.sockets.get(playerId)
  }

  sendToSocket<T extends keyof ServerToClientEvents>(
    socket: GameSocket,
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

  sendGameToSocket(socketId: string, game: Game) {
    const io = this.getIO()
    io.to(socketId).emit("game", game.toJson())
  }
}
