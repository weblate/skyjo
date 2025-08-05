import { Constants as CoreConstants, type GameStatus } from "@skymo/core"
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
      const response = await fetch(`${this.baseUrl}/games/${gameCode}/kick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ playerId }),
      })

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
      const response = await fetch(`${this.baseUrl}/games/${gameCode}/status`)

      if (!response.ok) {
        throw new Error(`Failed to check game status, ${response}`)
      }

      const data = (await response.json()) as {
        gameCode: string
        status: GameStatus
        connectedPlayersCount: number
        isPrivate: boolean
      }

      return {
        isActive:
          data.status === CoreConstants.GAME_STATUS.LOBBY ||
          data.status === CoreConstants.GAME_STATUS.PLAYING,
        hasPlayer: data.connectedPlayersCount > 0,
      }
    } catch (error) {
      Logger.error("Failed to check game status:", { error, gameCode })
      return { isActive: false, hasPlayer: false }
    }
  }
}
