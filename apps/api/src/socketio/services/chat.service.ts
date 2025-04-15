import { BaseService } from "@/socketio/services/base.service.js"
import type { GameSocket } from "@/socketio/types/gameSocket.js"
import { Constants as CoreConstants } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { UserChatMessage } from "@skymo/shared/types"

export class ChatService extends BaseService {
  async onMessage(
    socket: GameSocket,
    { username, message }: Omit<UserChatMessage, "id" | "type">,
  ) {
    const game = await this.getGame(socket.data.gameCode)

    if (!game.getPlayerById(socket.data.playerId)) {
      throw new CError(`Player try to send a message but is not found.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    game.updatedAt = new Date()

    const newMessage: UserChatMessage = {
      id: crypto.randomUUID(),
      username,
      message,
      type: CoreConstants.USER_MESSAGE_TYPE,
    }

    await this.messageRepository.storeMessage(game.code, newMessage)

    socket.to(game.code).volatile.emit("message", newMessage)
    socket.volatile.emit("message", newMessage)
  }

  async onWizz(socket: GameSocket, targetUsername: string) {
    const game = await this.getGame(socket.data.gameCode)

    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`Player try to send a message but is not found.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    socket
      .to(socket.data.gameCode)
      .volatile.emit("wizz", targetUsername, player.name)
  }
}
