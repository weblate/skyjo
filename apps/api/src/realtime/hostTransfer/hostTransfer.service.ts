import { Constants as CoreConstants } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { BaseService } from "@/realtime/base/base.service.js"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"

export class HostTransferService extends BaseService {
  async onTransferHost(socket: GameSocket, newHostId: string) {
    const game = await this.getGame(socket.data.gameCode)

    // Verify current player is the host
    if (!game.isHost(socket.data.playerId)) {
      throw new CError(
        `Player tried to transfer host role but is not the current host.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "info",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
            newHostId,
          },
        },
      )
    }

    // Find the target player
    const newHost = game.getPlayerById(newHostId)
    if (!newHost) {
      throw new CError(
        `Player tried to transfer host role to a player that is not in the game.`,
        {
          code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
            newHostId,
          },
        },
      )
    }

    // Verify the new host is connected
    if (
      newHost.connectionStatus !== CoreConstants.CONNECTION_STATUS.CONNECTED
    ) {
      throw new CError(
        `Player tried to transfer host role to a player that is not connected.`,
        {
          code: ErrorConstants.ERROR.PLAYER_NOT_CONNECTED,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
            newHostId,
            newHostConnectionStatus: newHost.connectionStatus,
          },
        },
      )
    }

    const stateManager = new GameStateTracker(game)

    game.hostId = newHostId
    game.updatedAt = new Date()

    await this.sendServerMessage(
      game.code,
      newHost.name,
      CoreConstants.SERVER_MESSAGE_TYPE.HOST_TRANSFERRED,
    )

    await this.updateAndSendGame(game, stateManager)
  }
}
