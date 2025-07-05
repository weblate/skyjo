import { Constants as CoreConstants } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { LastGame } from "@skymo/shared/validations"
import { GameStartCountdownQueueService } from "@/queues/GameStartCountdownQueueService.js"
import { BaseService } from "@/realtime/base/base.service.js"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"

export class PlayerService extends BaseService {
  private readonly countdownQueue = GameStartCountdownQueueService.getInstance()

  async onConnectionLost(socket: GameSocket) {
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

    if (
      game.isInLobby() &&
      (await this.countdownQueue.coundownExists(game.code))
    ) {
      await this.countdownQueue.cancelCountdown(game.code)
    }

    if (!game.isPlaying()) {
      await game.disconnectPlayer(player)

      const messageType = CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_LEFT
      await this.sendServerMessage(game.code, player.name, messageType)
    } else {
      player.connectionStatus = CoreConstants.CONNECTION_STATUS.LOST
    }

    await this.updateAndSendGame(game, stateManager)
  }

  async onLeave(socket: GameSocket) {
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

      await this.updateAndSendGame(game, stateManager)
      await socket.leave(game.code)
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

    await this.updateAndSendGame(game, stateManager)

    await this.joinGame(socket, game, player, true)
  }

  async onRecover(socket: GameSocket) {
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

    await this.updateAndSendGame(game, stateManager)
  }
}
