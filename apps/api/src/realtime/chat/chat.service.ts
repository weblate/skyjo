import { Constants as CoreConstants } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { UserChatMessage } from "@skymo/shared/types"
import { canChat } from "@/http/penalty/penalty.service.js"
import { BaseService } from "@/realtime/base/base.service.js"
import type { AuthenticatedGameSocket } from "@/realtime/types/gameSocket.js"

export class ChatService extends BaseService {
  async onMessage(socket: AuthenticatedGameSocket, { message }: { message: string }) {
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

    const playerCanChat = await canChat(player)
    if (!playerCanChat) {
      socket.volatile.emit("message:system", {
        id: crypto.randomUUID(),
        message: "You are currently restricted from chatting.",
        type: "system",
      })
      return
    }

    game.updatedAt = new Date()

    const newMessage: UserChatMessage = {
      id: crypto.randomUUID(),
      name: player.name,
      message,
      type: CoreConstants.USER_MESSAGE_TYPE,
    }

    await this.messageRepository.storeMessage(game.code, newMessage)

    socket.to(game.code).volatile.emit("message", newMessage)
    socket.volatile.emit("message", newMessage)
  }

  async onWizz(socket: AuthenticatedGameSocket, targetName: string) {
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
      .volatile.emit("wizz", targetName, player.name)
  }
}
