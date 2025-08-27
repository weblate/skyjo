import { Logger } from "@skymo/logger"
import { DiscordClient } from "@/discord.js"
import { registerAllFeatures } from "./features/index.js"
import { ReportMessageWorker } from "./report/reportWorker.js"

try {
  Logger.info("Starting Discord server...")

  // Register all interaction features
  registerAllFeatures()

  const discordClient = DiscordClient.getInstance()
  await discordClient.initialize()

  new ReportMessageWorker()

  Logger.info(`Discord server started successfully!`)
} catch (error) {
  console.log(error)
  Logger.error("Failed to start Discord server", { error })
  process.exit(1)
}
