import { Logger } from "@skymo/logger"
import { Client, GatewayIntentBits, type Interaction } from "discord.js"
import { ENV } from "../env.js"
import { handleInteraction } from "./interactions/index.js"

export class DiscordClient {
  private static instance: DiscordClient | null = null
  private readonly client: Client
  private isReady = false

  private constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
      ],
    })
    this.setupEventHandlers()
  }

  public static getInstance(): DiscordClient {
    DiscordClient.instance ??= new DiscordClient()

    return DiscordClient.instance
  }

  private setupEventHandlers(): void {
    this.client.once("ready", () => {
      Logger.info(`Discord bot logged in as ${this.client.user?.tag}`)
      this.isReady = true
    })

    this.client.on("error", (error: Error) => {
      Logger.error("Discord client error:", { error })
    })

    this.client.on("disconnect", () => {
      Logger.info("Discord client disconnected")
      this.isReady = false
    })

    this.client.on("interactionCreate", async (interaction: Interaction) => {
      try {
        await handleInteraction(interaction)
      } catch (error) {
        Logger.error("Error handling interaction:", { error })
      }
    })
  }

  async initialize(): Promise<void> {
    if (this.isReady) return

    try {
      Logger.info("Initializing Discord bot...")
      await this.client.login(ENV.DISCORD_BOT_TOKEN)

      // Wait for ready event
      await new Promise<void>((resolve, reject) => {
        if (this.isReady) {
          resolve()
        } else {
          const timeout = setTimeout(() => {
            reject(new Error("Discord bot initialization timeout"))
          }, 10000)

          this.client.once("ready", () => {
            clearTimeout(timeout)
            resolve()
          })
        }
      })
    } catch (error) {
      Logger.error("Failed to initialize Discord client:", { error })
      throw error
    }
  }

  getClient(): Client {
    return this.client
  }

  async destroy(): Promise<void> {
    Logger.info("Shutting down Discord client...")
    this.client.destroy()
    this.isReady = false
    // Reset the singleton instance so it can be recreated if needed
    DiscordClient.instance = null
  }
}
