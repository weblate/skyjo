import { Logger } from "@skymo/logger"
import { DiscordClient } from "@/discord.js"
import { ReportMessageWorker } from "./report/reportWorker.js"

try {
  Logger.info("Starting Discord server...")

  const discordClient = DiscordClient.getInstance()
  await discordClient.initialize()

  new ReportMessageWorker()

  Logger.info(`Discord server started successfully!`)
} catch (error) {
  console.log(error)
  Logger.error("Failed to start Discord server", { error })
  process.exit(1)
}
