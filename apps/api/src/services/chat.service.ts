import { BaseService } from "@/services/base.service.js"
import type { SkyjoSocket } from "@/types/skyjoSocket.js"
import { CError } from "@/utils/CError.js"
import { ERROR, USER_MESSAGE_TYPE } from "shared/constants"
import type { UserChatMessage } from "shared/types/chat"

export class ChatService extends BaseService {
  async onMessage(
    socket: SkyjoSocket,
    { username, message }: Omit<UserChatMessage, "id" | "type">,
  ) {
    const game = await this.getGame(socket.data.gameCode)

    if (!game.getPlayerById(socket.data.playerId)) {
      throw new CError(`Player try to send a message but is not found.`, {
        code: ERROR.PLAYER_NOT_FOUND,
        meta: {
          game,
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
      type: USER_MESSAGE_TYPE,
    }

    socket.to(game.code).emit("message", newMessage)
    socket.emit("message", newMessage)
  }
}
