import { ENV } from "@env"
import { Logger } from "@skymo/logger"
import { createClient } from "redis"

type RedisClientInstance = ReturnType<typeof createClient>

export class RedisClient {
  private static instance: RedisClientInstance | null = null
  private static connectionPromise: Promise<RedisClientInstance> | null = null
  private static connectionAttempts = 0
  private static readonly MAX_CONNECTION_ATTEMPTS = 5
  private static isConnecting = false
  private static readonly COMMAND_TIMEOUT_MS = 5000

  /**
   * Get an active Redis client instance
   */
  public static async getClient(): Promise<RedisClientInstance> {
    if (this.instance?.isOpen) return this.instance

    if (this.isConnecting && this.connectionPromise) {
      return this.connectionPromise
    }

    this.isConnecting = true
    this.connectionPromise = this.createConnection()

    try {
      this.instance = await this.connectionPromise
      this.connectionAttempts = 0
      return this.instance
    } finally {
      this.isConnecting = false
      this.connectionPromise = null
    }
  }

  /**
   * Create a new Redis connection with robust error handling
   */
  private static async createConnection(): Promise<RedisClientInstance> {
    if (this.instance) {
      try {
        await this.disconnect()
      } catch (error) {
        Logger.warn("Error disconnecting existing Redis client", { error })
      }
      this.instance = null
    }

    this.connectionAttempts++

    if (this.connectionAttempts > this.MAX_CONNECTION_ATTEMPTS) {
      this.connectionAttempts = 0
      throw new Error(
        `Failed to connect to Redis after ${this.MAX_CONNECTION_ATTEMPTS} attempts`,
      )
    }

    Logger.info("Creating new Redis connection")

    const client = createClient({
      url: ENV.REDIS_URL,
      socket: {
        connectTimeout: 2000,
        reconnectStrategy: (retries) => {
          Logger.info(`Redis reconnect attempt ${retries}`)
          if (retries > 3) {
            Logger.error("Redis connection failed after 3 retries")
            return new Error("Redis connection failed after 3 retries")
          }
          return Math.min(retries * 50, 1000)
        },
      },
      commandsQueueMaxLength: 5000,
    })

    client.on("error", (err) => {
      Logger.error("Redis Client Error", { error: err })
    })

    client.on("reconnecting", () => {
      Logger.info("Redis client reconnecting")
    })

    client.on("ready", () => {
      Logger.info("Redis client ready")
    })

    client.on("end", () => {
      Logger.info("Redis client connection closed")
      if (this.instance === client) {
        this.instance = null
      }
    })

    try {
      await client.connect()
      return client
    } catch (error) {
      Logger.error("Redis Connection Error", { error })

      await this.cleanupClient(client)
      throw error
    }
  }

  /**
   * Clean up a Redis client
   */
  private static async cleanupClient(
    client: RedisClientInstance,
  ): Promise<void> {
    try {
      if (client.isOpen) {
        await client.quit().catch((err) => {
          Logger.warn("Error during Redis client quit", { error: err })
        })
      }
    } catch (error) {
      Logger.warn("Error during Redis client cleanup", { error })
      try {
        await client.disconnect()
      } catch (disconnectError) {
        Logger.error("Failed to disconnect Redis client", {
          error: disconnectError,
        })
      }
    }
  }

  /**
   * Disconnect the Redis client
   */
  public static async disconnect(): Promise<void> {
    if (this.instance) {
      try {
        await this.cleanupClient(this.instance)
      } finally {
        this.instance = null
      }
    }
  }
}
