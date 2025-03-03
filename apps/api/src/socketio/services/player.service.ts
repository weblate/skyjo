import type { SkyjoSocket } from "@/socketio/types/skyjoSocket.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { Constants as CoreConstants } from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import type { LastGame } from "@skyjo/shared/validations"
import { BaseService } from "./base.service.js"

export class PlayerService extends BaseService {
  async onConnectionLost(socket: SkyjoSocket) {
    const game = await this.getGame(socket.data.gameCode)
    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`A player lost connection but is not in the game.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        level: "error",
        meta: {
          game,
          socket,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    const stateManager = new GameStateTracker(game)

    player.connectionStatus = CoreConstants.CONNECTION_STATUS.LOST

    await this.updateAndSendGame(game, stateManager)
  }

  async onLeave(socket: SkyjoSocket) {
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
              game,
              socket,
              gameCode: game.code,
              playerId: socket.data.playerId,
            },
          },
        )
      }

      player.connectionStatus = CoreConstants.CONNECTION_STATUS.LEAVE

      if (game.isAdmin(player.id)) game.changeAdmin()

      if (!game.isPlaying()) {
        game.removePlayer(player.id)

        if (game.players.length === 0) {
          await this.redis.removeGame(game.code)
          await socket.leave(game.code)
          return
        }
      }

      const message = CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_LEFT
      this.socketManager.sendToRoom({
        room: game.code,
        event: "message:server",
        data: [
          {
            id: crypto.randomUUID(),
            username: player.name,
            message,
            type: message,
          },
        ],
      })

      await this.updateAndSendGame(game, stateManager)
      await socket.leave(game.code)
    } catch (error) {
      // If the game is not found, it means the player wasn't in a game so we don't need to do anything
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

  async onReconnect(socket: SkyjoSocket, reconnectData: LastGame) {
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
            socket,
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

  async onRecover(socket: SkyjoSocket) {
    const game = await this.getGame(socket.data.gameCode)
    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`Player recover connection but is not in the game.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        level: "error",
        meta: {
          game,
          socket,
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
