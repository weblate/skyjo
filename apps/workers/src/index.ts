import { createGameCleanupWorker } from "@/game-cleanup/gameCleanupQueue.js"
import { Logger } from "@skymo/logger"

const gameCleanupWorker = createGameCleanupWorker()

setInterval(() => {
  const memoryUsage = process.memoryUsage()
  const memoryUsageFormatted = {
    rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
    heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
    heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
    external: `${Math.round(memoryUsage.external / 1024 / 1024)} MB`,
  }
  Logger.info(
    `Memory usage: ${JSON.stringify(memoryUsageFormatted)}`,
    memoryUsageFormatted,
  )
}, 60000)

async function gracefulShutdown() {
  Logger.info("Shutdown signal received")

  await gameCleanupWorker.close()

  process.exit(0)
}

process.on("SIGTERM", gracefulShutdown)
process.on("SIGINT", gracefulShutdown)
