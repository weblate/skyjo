import { CError, Constants as ErrorConstants } from "@skymo/error"
import { BaseService } from "@/realtime/base/base.service.js"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"

export class BanService extends BaseService {
  async onBanPlayer(socket: GameSocket, targetId: string) {
    const game = await this.getGame(socket.data.gameCode)

    if (!game.isHost(socket.data.playerId)) {
      throw new CError(
        `Player tried to ban another player but is not the host.`,
        {
          code: ErrorConstants.BAN_ERROR.NOT_ALLOWED,
          level: "info",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
            targetId,
          },
        },
      )
    }

    if (!game.settings.private) {
      throw new CError(
        `Player tried to ban another player but the game is not private.`,
        {
          code: ErrorConstants.BAN_ERROR.NOT_ALLOWED,
          level: "info",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
            targetId,
          },
        },
      )
    }

    const target = game.getPlayerById(targetId)
    if (!target) {
      throw new CError(
        `Player tried to ban another player but target is not found.`,
        {
          code: ErrorConstants.BAN_ERROR.PLAYER_NOT_FOUND,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
            targetId,
          },
        },
      )
    }

    const stateManager = new GameStateTracker(game)

    game.banPlayer(target)

    this.socketManager.sendToRoom({
      room: game.code,
      event: "ban:player-banned",
      data: [target.id, target.name],
    })

    await game.disconnectPlayer(target)

    await this.updateAndSendGame(game, stateManager)
  }
}
