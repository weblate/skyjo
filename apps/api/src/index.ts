import { initializeHttpServer } from "@/http/index.js"
import { RedisClient } from "@/redis/client.js"
import { initializeSocketServer } from "@/socketio/index.js"
import { serve } from "@hono/node-server"
import { Logger } from "@skymo/logger"
import { Hono } from "hono"
import "@env"
import { PlayerAfkQueueService } from "@/queues/PlayerAfkQueueService.js"
import { RevealCardsAfkQueueService } from "@/queues/RevealCardsAfkQueueService.js"
import { SocketManager } from "@/socketio/utils/SocketManager.js"

const app = new Hono()
const port = 3001
let server: ReturnType<typeof serve> | null = null

// Memory usage monitoring
const monitorMemoryUsage = () => {
  const formatMemoryUsage = (data: number) =>
    `${Math.round((data / 1024 / 1024) * 100) / 100} MB`

  const memoryData = process.memoryUsage()

  const memoryUsage = {
    rss: formatMemoryUsage(memoryData.rss), // Total memory allocated for the process execution
    heapTotal: formatMemoryUsage(memoryData.heapTotal), // Total size of the allocated heap
    heapUsed: formatMemoryUsage(memoryData.heapUsed), // Actual memory used during the execution
    external: formatMemoryUsage(memoryData.external), // Memory used by C++ objects bound to JavaScript objects
  }

  Logger.info("Memory usage", { memoryUsage })
}

// Start monitoring memory usage every 5 minutes
const memoryMonitorInterval = setInterval(monitorMemoryUsage, 60 * 1000)

const gracefulShutdown = async (signal: string) => {
  Logger.info(`Received ${signal}, starting graceful shutdown...`)

  try {
    // Stop memory monitoring
    clearInterval(memoryMonitorInterval)

    // Log final memory usage
    monitorMemoryUsage()

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

    // Clean up SocketManager
    Logger.info("Cleaning up SocketManager...")
    const socketManager = SocketManager.getInstance()
    if (socketManager.isInitialized()) {
      await socketManager.cleanup()
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

// Add these to your index.ts
process.on("uncaughtException", (error) => {
  Logger.error("Uncaught Exception:", { error })
  gracefulShutdown("Uncaught Exception")
})

process.on("unhandledRejection", (reason, promise) => {
  Logger.error("Unhandled Promise Rejection:", { reason, promise })
  gracefulShutdown("Unhandled Promise Rejection")
})

try {
  server = serve({
    fetch: app.fetch,
    port,
  })

  initializeSocketServer(server)
  initializeHttpServer(app)

  // Log initial memory usage
  monitorMemoryUsage()

  Logger.info(`Server started on port ${port}`)
} catch (error) {
  Logger.error("Failed to start server:", {
    error,
  })
  process.exit(1)
}
