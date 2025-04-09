import { BaseService } from "@/socketio/services/base.service.js"
import type { GameSocket } from "@/socketio/types/gameSocket.js"
import type { SightEngineMessage } from "@/socketio/types/sightengine.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { ENV } from "@env"
import { Constants as CoreConstants } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { UserChatMessage } from "@skymo/shared/types"
import type { Report } from "@skymo/shared/validations"

const sightEngineCategories = [
  "profanity",
  "extremism",
  "self-harm",
  "violence",
  "content-trade",
  "money-transaction",
  "spam",
] as const

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

  async onReport(socket: GameSocket, report: Report) {
    const game = await this.getGame(socket.data.gameCode)

    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`Player try to report a message but is not found.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    const target = game.getPlayerById(report.targetId)
    if (!target) {
      throw new CError(`Target player not found when reporting.`, {
        level: "warn",
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
          targetId: report.targetId,
        },
      })
    }

    let text = ""
    if (report.type === "message") {
      const message = await this.messageRepository.getMessageById(
        game.code,
        report.messageId,
      )
      if (!message) {
        throw new CError(`Message not found.`, {
          code: ErrorConstants.ERROR.MESSAGE_NOT_FOUND,
        })
      }

      text = message.message
    } else {
      text = target.name
    }

    const { safe, error } = await this.checkTextSafety(text)

    if (error) {
      throw new CError(`Unsuccessful request to SightEngine`, {
        code: ErrorConstants.ERROR.UNEXPECTED_ERROR,
        meta: {
          error,
          text,
          game: game.serialize(),
          socketId: socket.id,
          playerId: socket.data.playerId,
        },
      })
    }

    if (!safe) {
      const stateManager = new GameStateTracker(game)

      game.banPlayer(target)

      this.socketManager.sendToRoom({
        room: game.code,
        event: "kick:report",
        data: [target.id, target.name],
      })

      const messageType = CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_LEFT
      await this.sendServerMessage(game.code, target.name, messageType)

      await game.disconnectPlayer(target)

      await this.updateAndSendGame(game, stateManager)
    }
  }

  private async checkTextSafety(text: string) {
    const body = new FormData()

    body.append("text", text)
    body.append("lang", "en,fr,es")
    body.append(
      "categories",
      "profanity,extremism,self-harm,violence,content-trade,money-transaction,spam",
    )
    body.append("mode", "rules")
    body.append("api_user", ENV.SIGHTENGINE_API_USER)
    body.append("api_secret", ENV.SIGHTENGINE_API_SECRET)

    try {
      const response = await fetch(
        "https://api.sightengine.com/1.0/text/check.json",
        {
          method: "post",
          body,
        },
      )
      const data = (await response.json()) as SightEngineMessage

      let isSafe = true
      let reason = ""
      for (const category of sightEngineCategories) {
        if (data[category].matches.length > 0) {
          isSafe = false
          reason = category
          break
        }
      }

      if (isSafe) {
        return { safe: true }
      } else {
        return { safe: false, reason }
      }
    } catch (error) {
      return { error }
    }
  }
}
