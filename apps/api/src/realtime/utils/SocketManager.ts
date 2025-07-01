import { Server as HttpServer } from "http"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
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
  private pubClient: ReturnType<typeof createClient> | null = null
  private subClient: ReturnType<typeof createClient> | null = null
  private initialized = false

  private constructor() {}

  static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager()
    }
    return SocketManager.instance
  }

  async setIO(server: HttpServer): Promise<void> {
    if (this.io) return

    try {
      Logger.info("Initializing Redis clients for Socket.IO adapter")

      this.pubClient = createClient({
        url: ENV.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            Logger.info(`Redis Pub client reconnect attempt ${retries}`)
            if (retries > 5) {
              throw new Error(
                "Redis Pub client connection failed after 5 retries",
              )
            }
            return Math.min(retries * 100, 3000)
          },
        },
      })

      this.subClient = this.pubClient.duplicate()

      this.pubClient.on("error", (err) => {
        Logger.error("Redis Pub Client Error", { error: err })
      })

      this.subClient.on("error", (err) => {
        Logger.error("Redis Sub Client Error", { error: err })
      })

      await Promise.all([this.pubClient.connect(), this.subClient.connect()])
      Logger.info("Redis clients connected for Socket.IO adapter")

      const io = new Server<ClientToServerEvents, ServerToClientEvents>(
        server,
        {
          parser: customParser,
          transports: ["polling", "websocket"],
          cors: {
            origin: ENV.ORIGINS.split(","),
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
          adapter: createAdapter(this.pubClient, this.subClient),
        },
      )

      this.io = io
      this.initialized = true
      Logger.info("Socket.IO singleton initialized")
    } catch (error) {
      Logger.error("Failed to initialize Socket.IO server", { error })

      await this.cleanupRedisClients()
      throw error
    }
  }

  getIO(): Server<ClientToServerEvents, ServerToClientEvents> {
    if (!this.io) {
      throw new Error("Socket.IO server not initialized")
    }
    return this.io
  }

  isInitialized(): boolean {
    return this.initialized
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
    if (!socket.connected) {
      Logger.debug(`Socket ${socket.id} is disconnected, skipping message`, {
        socketId: socket.id,
        event: params.event,
      })
      return
    }
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

  private async cleanupRedisClients(): Promise<void> {
    Logger.info("Cleaning up Redis adapter clients")

    if (this.pubClient) {
      try {
        await this.pubClient.disconnect()
        Logger.info("Redis pub client disconnected")
      } catch (error) {
        Logger.error("Error disconnecting Redis pub client", { error })
      } finally {
        this.pubClient = null
      }
    }

    if (this.subClient) {
      try {
        await this.subClient.disconnect()
        Logger.info("Redis sub client disconnected")
      } catch (error) {
        Logger.error("Error disconnecting Redis sub client", { error })
      } finally {
        this.subClient = null
      }
    }
  }

  async cleanup(): Promise<void> {
    Logger.info("Cleaning up SocketManager resources")

    if (this.io) {
      try {
        const sockets = await this.io.fetchSockets()
        Logger.info(`Disconnecting ${sockets.length} active sockets`)

        for (const socket of sockets) {
          socket.disconnect(true)
        }

        this.io.disconnectSockets(true)

        await new Promise<void>((resolve) => {
          if (!this.io) {
            resolve()
            return
          }
          this.io.close(() => {
            Logger.info("Socket.IO server closed")
            resolve()
          })
        })
      } catch (error) {
        Logger.error("Error closing Socket.IO server", { error })
      } finally {
        this.io = null
      }
    }

    await this.cleanupRedisClients()
    this.initialized = false
  }
}
