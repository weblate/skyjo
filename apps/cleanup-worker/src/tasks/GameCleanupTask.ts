import { Logger } from "@skymo/logger"
import { RedisClient } from "../redis.js"

export interface GameCleanupData {
  gameCode: string
}

export class GameCleanupTask {
  private static readonly GAME_PREFIX = "game"
  private static readonly BATCH_SIZE = 20
  private static readonly YIELD_INTERVAL = 50

  public static async cleanupGame(gameCode: string) {
    Logger.info(`Starting cleanup for game ${gameCode}`, { gameCode })

    let client = null

    try {
      client = await RedisClient.getClient()
      let keyCount = 0
      const pattern = `${this.GAME_PREFIX}:${gameCode}:*`

      if (client) {
        for await (const key of client.scanIterator({
          MATCH: pattern,
          COUNT: 20,
        })) {
          await client.unlink(key)
          keyCount++

          if (keyCount % 50 === 0) {
            await new Promise((r) => setTimeout(r, 0))
          }
        }
      }

      Logger.info(`Deleted ${keyCount} keys for game ${gameCode}`, {
        gameCode,
        keyCount,
      })

      return { gameCode, deletedKeys: keyCount }
    } catch (error) {
      Logger.error(`Error during cleanup for game ${gameCode}`, {
        gameCode,
        error,
      })
      throw error
    }
  }
}
