import { GameOperationManager } from "@/realtime/utils/GameOperationManager.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { SocketManager } from "@/realtime/utils/SocketManager.js"
import { GameRepository } from "@/redis/game.repository.js"
import type { Game, Player } from "@skymo/core"
import { Constants as CoreConstants } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
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
        attempts: 2,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: true,
      },
    })

    Logger.info(`BaseAfkQueueService initialized: ${queueName}`)
  }

  protected getAfkTimeout(game: Game): number {
    const timeout = game.settings.private
      ? CoreConstants.AFK_TIMEOUT.PRIVATE
      : CoreConstants.AFK_TIMEOUT.PUBLIC

    const finalTimeout = timeout + 1000 // 1 seconds grace period

    Logger.debug(`AFK timeout for game ${game.code}: ${finalTimeout}ms`, {
      gameCode: game.code,
      isPrivate: game.settings.private,
      baseTimeout: timeout,
      finalTimeout,
    })

    return finalTimeout
  }

  protected isAfk(player: Player) {
    return (
      player.consecutiveAfkCount >= CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE ||
      player.afkCount >= CoreConstants.AFK_TIMEOUT.MAX_TOTAL
    )
  }

  protected async increaseAfkCount(game: Game, player: Player) {
    player.afkCount++
    player.consecutiveAfkCount++

    Logger.debug(
      `Increased AFK count for player ${player.id} (${player.name})`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
        consecutiveAfkCount: player.consecutiveAfkCount,
        totalAfkCount: player.afkCount,
      },
    )

    if (this.isAfk(player)) {
      Logger.info(
        `Player ${player.id} (${player.name}) exceeded AFK limits, disconnecting`,
        {
          gameCode: game.code,
          playerId: player.id,
          playerName: player.name,
          consecutiveAfkCount: player.consecutiveAfkCount,
          totalAfkCount: player.afkCount,
        },
      )
      await this.disconnectPlayer(game, player)
      return true
    }

    return false
  }

  protected warnPlayer(player: Player) {
    Logger.debug(
      `Sending AFK warning to player ${player.id} (${player.name})`,
      {
        playerId: player.id,
        playerName: player.name,
        socketId: player.socketId,
      },
    )

    const socket = this.socketManager.getSocket(player.socketId)
    if (socket) {
      socket.volatile.emit("kick:afk-warning")
    }
  }

  protected async disconnectPlayer(game: Game, player: Player) {
    Logger.info(
      `Disconnecting AFK player ${player.id} (${player.name}) from game ${game.code}`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
      },
    )

    const stateManager = new GameStateTracker(game)

    await game.disconnectPlayer(player)

    const socket = this.socketManager.getSocket(player.socketId)
    if (socket) {
      Logger.debug(
        `Sent kick:afk event to player ${player.id} (${player.name})`,
        {
          gameCode: game.code,
          playerId: player.id,
          playerName: player.name,
        },
      )
      this.socketManager.sendToSocket(socket, {
        event: "kick:afk",
        data: [],
      })
    }

    this.socketManager.sendToRoom({
      room: game.code,
      event: "kick:player-afk",
      data: [player.name],
    })

    Logger.debug(`Sent kick:player-afk event to room ${game.code}`, {
      gameCode: game.code,
      playerId: player.id,
      playerName: player.name,
    })

    await this.updateAndSendGame(game, stateManager)
  }

  protected async getGame(gameCode: string) {
    const game = await this.redis.getGame(gameCode)

    game.setOperationManager(GameOperationManager.getInstance())

    return game
  }

  protected async updateAndSendGame(
    game: Game,
    stateManager: GameStateTracker,
  ) {
    const operations = stateManager.getChanges()
    if (!operations) {
      Logger.debug(`No changes to update for game ${game.code}`, {
        gameCode: game.code,
      })
      return
    }
    await this.redis.updateGame(game, operations)
    this.socketManager.sendToRoom({
      room: game.code,
      event: "game:update",
      data: [operations],
    })

    Logger.debug(`Game ${game.code} updated and sent to clients`, {
      gameCode: game.code,
      operations,
    })
  }

  protected async lockGame(game: Game) {
    Logger.info(`Locking game ${game.code} for AFK processing`, {
      gameCode: game.code,
    })

    if (game.processingAfk) {
      throw new CError("Game is already processing afk", {
        level: "error",
        code: ErrorConstants.ERROR.GAME_ALREADY_PROCESSING_AFK,
      })
    }

    game.processingAfk = true
    await this.redis.updateGame(game)
  }

  protected async unlockGame(game: Game) {
    Logger.info(`Unlocking game ${game.code} from AFK processing`, {
      gameCode: game.code,
    })

    game.processingAfk = false
    await this.redis.updateGame(game)
  }
}
