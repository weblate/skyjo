import { GameRepository } from "@/redis/game.repository.js"
import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import type { Skyjo, SkyjoPlayer } from "@skyjo/core"
import { Constants as CoreConstants } from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import { BaseQueueService } from "./BaseQueueService.js"

export interface AfkJobData {
  gameCode: string
  playerId?: string
}

export abstract class BaseAfkQueueService<
  T extends AfkJobData,
> extends BaseQueueService<T> {
  protected redis = new GameRepository()
  protected socketManager = SocketManager.getInstance()

  constructor(queueName: string) {
    super(queueName, {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    })
  }

  protected getAfkTimeout(game: Skyjo): number {
    return game.settings.private
      ? CoreConstants.AFK_TIMEOUT.PRIVATE
      : CoreConstants.AFK_TIMEOUT.PUBLIC
  }

  protected isAfk(player: SkyjoPlayer) {
    return (
      player.consecutiveAfkCount >= CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE ||
      player.afkCount >= CoreConstants.AFK_TIMEOUT.MAX_TOTAL
    )
  }

  protected async increaseAfkCount(game: Skyjo, player: SkyjoPlayer) {
    player.afkCount++
    player.consecutiveAfkCount++

    if (this.isAfk(player)) {
      await this.disconnectPlayer(game, player)
      return true
    }

    return false
  }

  protected async disconnectPlayer(game: Skyjo, player: SkyjoPlayer) {
    const stateManager = new GameStateTracker(game)
    await game.disconnectPlayer(player)
    await this.updateAndSendGame(game, stateManager)
  }

  protected async getGame(gameCode: string) {
    const game = await this.redis.getGame(gameCode)

    game.setOperationManager(GameOperationManager.getInstance())

    return game
  }

  protected async updateAndSendGame(
    game: Skyjo,
    stateManager: GameStateTracker,
  ) {
    const operations = stateManager.getChanges()
    if (!operations) return

    await this.redis.updateGame(game, operations)
    this.socketManager.sendToRoom({
      room: game.code,
      event: "game:update",
      data: [operations],
    })
  }

  protected async lockGame(game: Skyjo) {
    if (game.processingAfk) {
      throw new CError("Game is already processing afk", {
        code: ErrorConstants.ERROR.GAME_ALREADY_PROCESSING_AFK,
      })
    }

    game.processingAfk = true
    await this.redis.updateGame(game)
  }

  protected async unlockGame(game: Skyjo) {
    game.processingAfk = false
    await this.redis.updateGame(game)
  }
}
