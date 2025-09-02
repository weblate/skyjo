import { ENV } from "@env"
import type { Game } from "@skymo/core"
import { Logger } from "@skymo/logger"
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@skymo/shared/types"
import { createAdapter } from "@socket.io/redis-streams-adapter"
import dayjs from "dayjs"
import { Server as HttpServer } from "http"
import { createClient } from "redis"
import { Server } from "socket.io"
import customParser from "socket.io-msgpack-parser"
import type { GameSocket } from "@/realtime/types/gameSocket.js"

export class SocketManager {
  private static instance: SocketManager
  private io: Server<ClientToServerEvents, ServerToClientEvents> | null = null
  private redisClient: ReturnType<typeof createClient> | null = null
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

      this.redisClient = createClient({
        url: ENV.REDIS_URL,
        socket: {
          reconnectStrategy: (retries) => {
            Logger.info(`Redis client reconnect attempt ${retries}`)
            if (retries > 5) {
              throw new Error("Redis client connection failed after 5 retries")
            }
            return Math.min(retries * 100, 3000)
          },
        },
      })

      this.redisClient.on("error", (error) => {
        Logger.error("Redis Client Error", { error })
      })

      this.redisClient.on("connect", () => {
        Logger.info("Redis client connected")
      })

      this.redisClient.on("disconnect", () => {
        Logger.info("Redis client disconnected")
      })

      await this.redisClient.connect()
      Logger.info("Redis client connected for Socket.IO adapter")

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
          adapter: createAdapter(this.redisClient),
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

    if (this.redisClient) {
      try {
        await this.redisClient.destroy()
        Logger.info("Redis client disconnected")
      } catch (error) {
        Logger.error("Error disconnecting Redis client", { error })
      } finally {
        this.redisClient = null
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
