import { Constants as CoreConstants } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { LastGame } from "@skymo/shared/validations"
import { GameStartCountdownQueueService } from "@/queues/GameStartCountdownQueueService.js"
import { BaseService } from "@/realtime/base/base.service.js"
import { clearSocketData } from "@/realtime/middleware/socketDataValidation.js"
import type {
  AuthenticatedGameSocket,
  GameSocket,
} from "@/realtime/types/gameSocket.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import {
  trackAnalyticsGameAbandoned,
  trackAnalyticsPlayerLeft,
} from "@/services/analytics/game.analytics.js"

export class PlayerService extends BaseService {
  private readonly countdownQueue = GameStartCountdownQueueService.getInstance()

  async onConnectionLost(socket: AuthenticatedGameSocket) {
    const game = await this.getGame(socket.data.gameCode)
    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`A player lost connection but is not in the game.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        level: "error",
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    const stateManager = new GameStateTracker(game)

    const hasToCancelCountdown =
      game.isInLobby() && (await this.countdownQueue.coundownExists(game.code))
    if (hasToCancelCountdown) {
      await this.countdownQueue.cancelCountdown(game.code)
    }

    if (game.isPlaying()) {
      player.connectionStatus = CoreConstants.CONNECTION_STATUS.LOST
    } else {
      await game.disconnectPlayer(player)

      const messageType = CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_LEFT
      await this.sendServerMessage(game.code, player.name, messageType)

      trackAnalyticsPlayerLeft(game, player, "disconnect")

      const remainingPlayers = game.getConnectedPlayers().length
      if (remainingPlayers === 0 && game.roundNumber > 0) {
        trackAnalyticsGameAbandoned(game, 0, "all_players_left")
      }
    }

    await this.updateAndSendGame(game, stateManager)
  }

  async onLeave(socket: AuthenticatedGameSocket) {
    try {
      const game = await this.getGame(socket.data.gameCode)
      const stateManager = new GameStateTracker(game)

      const player = game.getPlayerById(socket.data.playerId)
      if (!player) {
        throw new CError(
          `Player try to leave a game but he has not been found in it.`,
          {
            code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
            level: "warn",
            meta: {
              game: game.serialize(),
              socketId: socket.id,
              gameCode: game.code,
              playerId: socket.data.playerId,
            },
          },
        )
      }

      if (
        game.isInLobby() &&
        (await this.countdownQueue.coundownExists(game.code))
      ) {
        await this.countdownQueue.cancelCountdown(game.code)
      }

      await game.setPlayerToLeave(player)

      const messageType = CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_LEFT
      await this.sendServerMessage(game.code, player.name, messageType)

      trackAnalyticsPlayerLeft(game, player, "voluntary")

      const remainingPlayers = game.getConnectedPlayers().length
      if (remainingPlayers === 0 && game.roundNumber > 0) {
        trackAnalyticsGameAbandoned(game, 0, "all_players_left")
      } else if (
        game.isHost(player.id) &&
        remainingPlayers > 0 &&
        game.roundNumber > 0
      ) {
        trackAnalyticsGameAbandoned(game, remainingPlayers, "host_left")
      }

      await this.updateAndSendGame(game, stateManager)

      // Clean up empty games that are finished or stopped
      const hasNoConnectedPlayers = remainingPlayers === 0
      if (hasNoConnectedPlayers && !game.isPlaying()) {
        await this.redis.removeGame(game.code)
      }

      await socket.leave(game.code)

      // Clear socket data to prevent stale data from affecting future disconnections
      clearSocketData(socket)
    } catch (error) {
      if (
        error instanceof CError &&
        error.code === ErrorConstants.ERROR.GAME_NOT_FOUND
      ) {
        return
      } else {
        throw error
      }
    }
  }

  async onReconnect(socket: GameSocket, reconnectData: LastGame) {
    const canReconnect = await this.redis.canReconnectPlayer(
      reconnectData.gameCode,
      reconnectData.playerId,
      reconnectData.sessionId,
    )
    if (!canReconnect) {
      throw new CError(
        `Player try to reconnect but he does not valid the reconnection conditions.`,
        {
          code: ErrorConstants.ERROR.CANNOT_RECONNECT,
          level: "warn",
          meta: {
            socketId: socket.id,
            gameCode: reconnectData.gameCode,
            playerId: reconnectData.playerId,
            sessionId: reconnectData.sessionId,
          },
        },
      )
    }

    await this.redis.updatePlayerSocketId(
      reconnectData.gameCode,
      reconnectData.playerId,
      socket.id,
    )

    const game = await this.getGame(reconnectData.gameCode)

    const player = game.getPlayerById(reconnectData.playerId)!

    const stateManager = new GameStateTracker(game)

    player.socketId = socket.id
    player.connectionStatus = CoreConstants.CONNECTION_STATUS.CONNECTED

    player.rotateSession()

    await this.updateAndSendGame(game, stateManager)

    await this.joinGame(socket, game, player, true)
  }

  async onRecover(socket: AuthenticatedGameSocket) {
    const game = await this.getGame(socket.data.gameCode)
    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`Player recover connection but is not in the game.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        level: "error",
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    const stateManager = new GameStateTracker(game)

    player.connectionStatus = CoreConstants.CONNECTION_STATUS.CONNECTED

    // Reset disconnectedAfkCount when player reconnects
    player.disconnectedAfkCount = 0

    await this.updateAndSendGame(game, stateManager)
  }

  async onIntentionalDisconnect(socket: AuthenticatedGameSocket) {
    try {
      const game = await this.getGame(socket.data.gameCode)

      // For public games during play, forfeit the player
      if (!game.settings.private && game.isPlaying()) {
        await this.onForfeit(socket)
      } else {
        await this.onLeave(socket)
      }
    } catch (error) {
      if (
        error instanceof CError &&
        error.code === ErrorConstants.ERROR.GAME_NOT_FOUND
      ) {
        return
      } else {
        throw error
      }
    }
  }

  async onForfeit(socket: AuthenticatedGameSocket) {
    try {
      const game = await this.getGame(socket.data.gameCode)
      const stateManager = new GameStateTracker(game)

      const player = game.getPlayerById(socket.data.playerId)
      if (!player) {
        throw new CError(
          `Player try to forfeit a game but he has not been found in it.`,
          {
            code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
            level: "warn",
            meta: {
              game: game.serialize(),
              socketId: socket.id,
              gameCode: game.code,
              playerId: socket.data.playerId,
            },
          },
        )
      }

      // Mark player as forfeited with timestamp
      player.forfeited = true
      player.forfeitedAt = Date.now()

      await game.disconnectPlayer(player)

      const messageType = CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_FORFEITED
      await this.sendServerMessage(game.code, player.name, messageType)

      await this.updateAndSendGame(game, stateManager)

      // Clean up empty games that are finished or stopped
      const hasNoConnectedPlayers = game.getConnectedPlayers().length === 0
      if (hasNoConnectedPlayers && (game.isStopped() || game.isFinished())) {
        await this.redis.removeGame(game.code)
      }

      await socket.leave(game.code)
      clearSocketData(socket)
    } catch (error) {
      if (
        error instanceof CError &&
        error.code === ErrorConstants.ERROR.GAME_NOT_FOUND
      ) {
        return
      } else {
        throw error
      }
    }
  }
}
