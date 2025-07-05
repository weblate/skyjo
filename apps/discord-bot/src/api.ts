import { Logger } from "@skymo/logger"
import { ENV } from "../env.js"

export class ApiClient {
  private static instance: ApiClient | null = null
  private readonly baseUrl: string

  private constructor() {
    this.baseUrl = ENV.API_BASE_URL.replace(/\/$/, "")
  }

  public static getInstance(): ApiClient {
    ApiClient.instance ??= new ApiClient()
    return ApiClient.instance
  }

  async kickPlayer(gameCode: string, playerId: string): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/game/${gameCode}/kick`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ playerId }),
        },
      )

      if (!response.ok) {
        throw new Error(`Failed to kick player: ${response.statusText}`)
      }

      Logger.info(`Player ${playerId} kicked from game ${gameCode}`)
    } catch (error) {
      Logger.error("Failed to kick player:", { error, gameCode, playerId })
      throw error
    }
  }

  async checkGameStatus(
    gameCode: string,
  ): Promise<{ isActive: boolean; hasPlayer: boolean }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/game/${gameCode}/status`,
      )

      if (!response.ok) {
        throw new Error(`Failed to check game status: ${response.statusText}`)
      }

      const data = (await response.json()) as {
        isActive?: boolean
        hasPlayer?: boolean
      }
      return {
        isActive: data.isActive || false,
        hasPlayer: data.hasPlayer || false,
      }
    } catch (error) {
      Logger.error("Failed to check game status:", { error, gameCode })
      return { isActive: false, hasPlayer: false }
    }
  }
}
