import { randomUUID } from "node:crypto"
import type { Game, Player } from "@skymo/core"
import { Constants as CoreConstants } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import { GameOperationManager } from "@/realtime/utils/GameOperationManager.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { SocketManager } from "@/realtime/utils/SocketManager.js"
import { RedisClient } from "@/redis/client.js"
import { GameRepository } from "@/redis/game.repository.js"
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

  protected getAfkTimeout(game: Game, player?: Player): number {
    if (!player) {
      throw new Error("Player is required for getAfkTimeout")
    }

    const timeout = player.getTimeout()
    const finalTimeout = timeout + 1000 // 1 second grace period

    Logger.debug(
      `AFK timeout for player ${player.id} in game ${game.code}: ${finalTimeout}ms`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
        connectionStatus: player.connectionStatus,
        baseTimeout: timeout,
        finalTimeout,
      },
    )

    return finalTimeout
  }

  protected isAfk(player: Player, game: Game) {
    const totalLimit = game.settings.private
      ? CoreConstants.AFK_LIMIT.GAME_TOTAL.PRIVATE
      : CoreConstants.AFK_LIMIT.GAME_TOTAL.PUBLIC

    if (player.afkCount >= totalLimit) {
      return true
    }

    const isConnected =
      player.connectionStatus === CoreConstants.CONNECTION_STATUS.CONNECTED

    if (isConnected) {
      return player.afkCount >= CoreConstants.AFK_LIMIT.CONNECTED
    }

    // For disconnected players: different limits based on game type
    const disconnectedLimit = game.settings.private
      ? CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PRIVATE
      : CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PUBLIC

    return player.disconnectedAfkCount >= disconnectedLimit
  }

  protected async increaseAfkCount(game: Game, player: Player) {
    const isConnected =
      player.connectionStatus === CoreConstants.CONNECTION_STATUS.CONNECTED

    player.afkCount++
    player.consecutiveAfkCount++

    // Also increment disconnectedAfkCount if player is disconnected
    if (!isConnected) {
      player.disconnectedAfkCount++
    }

    Logger.debug(
      `Increased AFK count for player ${player.id} (${player.name})`,
      {
        gameCode: game.code,
        playerId: player.id,
        playerName: player.name,
        connectionStatus: player.connectionStatus,
        consecutiveAfkCount: player.consecutiveAfkCount,
        totalAfkCount: player.afkCount,
        disconnectedAfkCount: player.disconnectedAfkCount,
      },
    )

    if (this.isAfk(player, game)) {
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

  /**
   * Acquire Redis distributed lock for reveal phase AFK processing
   * Polls for lock availability up to the specified timeout
   */
  protected async acquireLockWithPolling(
    gameCode: string,
    timeoutMs: number,
  ): Promise<string> {
    const lockKey = `game:${gameCode}:reveal-afk-lock`
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const lockToken = randomUUID()
      const client = await RedisClient["getClient"]()

      try {
        const result = await client.set(lockKey, lockToken, {
          NX: true,
          EX: 30,
        })

        if (result === "OK") {
          Logger.debug(
            `Acquired reveal AFK lock for game ${gameCode} (token: ${lockToken})`,
            {
              gameCode,
              lockToken,
              lockKey,
            },
          )
          return lockToken
        }
      } catch (error) {
        Logger.warn(`Error attempting to acquire lock for game ${gameCode}`, {
          gameCode,
          error: error instanceof Error ? error.message : String(error),
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    throw new CError(`Timeout acquiring reveal AFK lock for game ${gameCode}`, {
      code: ErrorConstants.ERROR.GAME_LOCK_TIMEOUT,
      level: "error",
      meta: { gameCode, timeoutMs },
    })
  }

  /**
   * Release Redis distributed lock with token validation
   */
  protected async releaseLock(
    gameCode: string,
    lockToken: string,
  ): Promise<void> {
    const lockKey = `game:${gameCode}:reveal-afk-lock`
    const client = await RedisClient["getClient"]()

    try {
      // Only delete if the token matches (prevents releasing someone else's lock)
      const currentToken = await client.get(lockKey)

      if (currentToken === lockToken) {
        await client.del(lockKey)
        Logger.debug(
          `Released reveal AFK lock for game ${gameCode} (token: ${lockToken})`,
          {
            gameCode,
            lockToken,
            lockKey,
          },
        )
      } else if (currentToken === null) {
        Logger.debug(
          `Lock already expired for game ${gameCode} (token: ${lockToken})`,
          {
            gameCode,
            lockToken,
            lockKey,
          },
        )
      } else {
        Logger.warn(
          `Lock token mismatch for game ${gameCode} - not releasing`,
          {
            gameCode,
            expectedToken: lockToken,
            actualToken: currentToken,
            lockKey,
          },
        )
      }
    } catch (error) {
      Logger.error(`Error releasing lock for game ${gameCode}`, {
        gameCode,
        lockToken,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }
}
