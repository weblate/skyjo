import { httpApp } from "@/http/index.js"
import { GameStartCountdownQueueService } from "@/queues/GameStartCountdownQueueService.js"
import { KickVoteExpirationQueueService } from "@/queues/KickVoteExpirationQueueService.js"
import { PlayerAfkQueueService } from "@/queues/PlayerAfkQueueService.js"
import { RevealCardsAfkQueueService } from "@/queues/RevealCardsAfkQueueService.js"
import { initializeSocketServer } from "@/realtime/index.js"
import { SocketManager } from "@/realtime/utils/SocketManager.js"
import { RedisClient } from "@/redis/client.js"
import { ENV } from "@env"
import { serve } from "@hono/node-server"
import { Logger } from "@skymo/logger"
import { Hono } from "hono"

const app = new Hono()
const port = ENV.PORT
let server: ReturnType<typeof serve> | null = null

const monitorMemoryUsage = () => {
  const formatMemoryUsage = (data: number) =>
    `${Math.round((data / 1024 / 1024) * 100) / 100} MB`

  const memoryData = process.memoryUsage()

  const memoryUsage = {
    rss: formatMemoryUsage(memoryData.rss),
    heapTotal: formatMemoryUsage(memoryData.heapTotal),
    heapUsed: formatMemoryUsage(memoryData.heapUsed),
    external: formatMemoryUsage(memoryData.external),
  }

  Logger.info(`Memory usage: ${JSON.stringify(memoryUsage)}`, {
    memoryUsage,
  })
}

const memoryMonitorInterval = setInterval(monitorMemoryUsage, 60 * 1000)

const gracefulShutdown = async (signal: string) => {
  Logger.info(`Received ${signal}, starting graceful shutdown...`)

  try {
    clearInterval(memoryMonitorInterval)

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

    if (KickVoteExpirationQueueService.exists()) {
      Logger.info("Cleaning up KickVoteExpirationQueueService...")
      const kickVoteExpirationQueueService =
        KickVoteExpirationQueueService.getInstance()

      await kickVoteExpirationQueueService.cleanup()
    }

    if (GameStartCountdownQueueService.exists()) {
      Logger.info("Cleaning up GameStartCountdownQueueService...")
      const gameStartCountdownQueueService =
        GameStartCountdownQueueService.getInstance()

      await gameStartCountdownQueueService.cleanup()
    }

    Logger.info("Cleaning up SocketManager...")
    const socketManager = SocketManager.getInstance()
    if (socketManager.isInitialized()) {
      await socketManager.cleanup()
    }

    if (server) {
      Logger.info("Closing HTTP server...")
      await new Promise<void>((resolve) => {
        if (!server) {
          resolve()
          return
        }
        server.close(() => resolve())
      })
    }

    Logger.info("Closing Redis connections...")
    await RedisClient.disconnect()

    const forceExitTimeout = setTimeout(() => {
      Logger.warn("Forcing process exit after timeout")
      process.exit(0)
    }, 5000)

    forceExitTimeout.unref()

    Logger.info("Graceful shutdown completed")
    process.exit(0)
  } catch (error) {
    Logger.error("Error during graceful shutdown:", { error })
    process.exit(1)
  }
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"))
process.on("SIGINT", () => gracefulShutdown("SIGINT"))

process.on("uncaughtException", (error) => {
  Logger.error("Uncaught Exception:", { error })
  gracefulShutdown("Uncaught Exception")
})

process.on("unhandledRejection", (reason, promise) => {
  Logger.error("Unhandled Promise Rejection:", { reason, promise })
  gracefulShutdown("Unhandled Promise Rejection")
})

const startServer = async () => {
  try {
    server = serve({
      fetch: app.fetch,
      port,
    })

    await initializeSocketServer(server)
    app.route("/", httpApp)

    PlayerAfkQueueService.getInstance()
    RevealCardsAfkQueueService.getInstance()
    KickVoteExpirationQueueService.getInstance()
    GameStartCountdownQueueService.getInstance()

    monitorMemoryUsage()

    Logger.info(`Server started on port ${port}`)
  } catch (error) {
    Logger.error("Failed to start server:", {
      error,
    })
    process.exit(1)
  }
}

startServer().catch((error) => {
  Logger.error("Error during server startup:", { error })
  process.exit(1)
})
