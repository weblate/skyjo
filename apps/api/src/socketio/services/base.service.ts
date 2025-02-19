import { GameRepository } from "@/redis/game.repository.js"
import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import {
  Constants as CoreConstants,
  type Skyjo,
  type SkyjoPlayer,
} from "@skyjo/core"
import type { ServerChatMessage } from "@skyjo/shared/types"
import { PlayerAfkQueueService } from "../../queues/PlayerAfkQueueService.js"
import { RevealCardsAfkQueueService } from "../../queues/RevealCardsAfkQueueService.js"
import type { SkyjoSocket } from "../types/skyjoSocket.js"

export abstract class BaseService {
  protected redis = new GameRepository()
  protected socketManager = SocketManager.getInstance()

  protected afkQueue: PlayerAfkQueueService = new PlayerAfkQueueService()
  protected revealCardsAfkQueue: RevealCardsAfkQueueService =
    new RevealCardsAfkQueueService()

  protected async sendMissingStatesToSocket(
    socket: SkyjoSocket,
    game: Skyjo,
    clientStateVersion: number,
  ) {
    const states = await this.redis.getGameStates(
      game.code,
      clientStateVersion + 1,
      game.stateVersion,
    )
    this.socketManager.sendToSocket(socket, {
      event: "game:fix",
      data: [states],
    })
  }

  protected async updateAndSendGame(
    game: Skyjo,
    stateManager: GameStateTracker,
  ) {
    const operations = stateManager.getChanges()
    if (!operations) return

    await this.redis.updateGame(game, operations)

    this.socketManager.sendToRoom({
      room: game.code,
      event: "game:update",
      data: [operations],
    })
  }

  protected async getGame(gameCode: string) {
    const game = await this.redis.getGame(gameCode)

    game.setOperationManager(
      new GameOperationManager({
        redis: this.redis,
        playerAfkQueue: this.afkQueue,
        revealCardsAfkQueue: this.revealCardsAfkQueue,
        socketManager: this.socketManager,
      }),
    )

    return game
  }

  protected async joinGame(
    socket: SkyjoSocket,
    game: Skyjo,
    player: SkyjoPlayer,
    reconnection: boolean = false,
  ) {
    await socket.join(game.code)

    socket.data = {
      gameCode: game.code,
      playerId: player.id,
    }

    this.socketManager.sendToSocket(socket, {
      event: "game:join",
      data: [game.code, game.status, player.id],
    })

    const messageType = reconnection
      ? CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_RECONNECT
      : CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_JOINED
    const message: ServerChatMessage = {
      id: crypto.randomUUID(),
      username: player.name,
      message: messageType,
      type: messageType,
    }

    this.socketManager.sendToRoom({
      room: game.code,
      event: "message:server",
      data: [message],
    })

    await this.redis.updateGame(game)
  }
}
