import { initializeHttpServer } from "@/http/index.js"
import { RedisClient } from "@/redis/client.js"
import { initializeSocketServer } from "@/socketio/index.js"
import { serve } from "@hono/node-server"
import { Logger } from "@skyjo/logger"
import { Hono } from "hono"
import "@env"
import { PlayerAfkQueueService } from "@/queues/PlayerAfkQueueService.js"
import { RevealCardsAfkQueueService } from "@/queues/RevealCardsAfkQueueService.js"

const app = new Hono()
const port = 3001
let server: ReturnType<typeof serve> | null = null

const gracefulShutdown = async (signal: string) => {
  Logger.info(`Received ${signal}, starting graceful shutdown...`)

  try {
    if (PlayerAfkQueueService.exists()) {
      Logger.info("Cleaning up PlayerAfkQueueService...")
      const playerAfkQueueService = PlayerAfkQueueService.getInstance()

      await playerAfkQueueService.cleanup()
    }

    if (RevealCardsAfkQueueService.exists()) {
      Logger.info("Cleaning up RevealCardsAfkQueueService...")
      const revealCardsAfkQueueService =
        RevealCardsAfkQueueService.getInstance()

      await revealCardsAfkQueueService.cleanup()
    }

    if (server) {
      Logger.info("Closing HTTP server...")
      await new Promise<void>((resolve) => {
        server?.close(() => resolve())
      })
    }

    Logger.info("Closing Redis connections...")
    await RedisClient.disconnect()

    Logger.info("Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    Logger.error("Error during graceful shutdown:", { error })
    process.exit(1)
  }
}

// Register shutdown handlers
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

try {
  server = serve({
    fetch: app.fetch,
    port,
  })

  initializeSocketServer(server)
  initializeHttpServer(app)

  Logger.info(`Server started on port ${port}`)
} catch (error) {
  Logger.error("Failed to start server:", {
    error,
  })
  process.exit(1)
}
