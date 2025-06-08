import { createGameCleanupWorker } from "@/game-cleanup/gameCleanupQueue.js"
import { createPostgresCleanupWorker } from "@/postgres-cleanup/postgresCleanupQueue.js"
import { Logger } from "@skymo/logger"
import "@env"
import { createGameStorageWorker } from "@/game-storage/gameStorageQueue.js"
import { createMailerWorker } from "@/mailer/mailerQueue.js"
import { initializePostgresCleanupScheduler, postgresCleanupQueue } from "@/postgres-cleanup/postgresCleanup.js"

const gameCleanupWorker = createGameCleanupWorker()
const postgresCleanupWorker = createPostgresCleanupWorker()
const mailerWorker = createMailerWorker()
const gameStorageWorker = createGameStorageWorker()
await initializePostgresCleanupScheduler()

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
  await postgresCleanupWorker.close()
  await mailerWorker.close()
  await gameStorageWorker.close()
  await postgresCleanupQueue.close()

  process.exit(0)
}

process.on("SIGTERM", gracefulShutdown)
process.on("SIGINT", gracefulShutdown)
