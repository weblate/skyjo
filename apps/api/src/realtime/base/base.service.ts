import {
  Constants as CoreConstants,
  type Game,
  type Player,
  type ServerMessageType,
} from "@skymo/core"
import type { ServerChatMessage } from "@skymo/shared/types"
import { KickVoteExpirationQueueService } from "@/queues/KickVoteExpirationQueueService.js"
import { PlayerAfkQueueService } from "@/queues/PlayerAfkQueueService.js"
import { RevealCardsAfkQueueService } from "@/queues/RevealCardsAfkQueueService.js"
import { GameOperationManager } from "@/realtime/utils/GameOperationManager.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { SocketManager } from "@/realtime/utils/SocketManager.js"
import { GameRepository } from "@/redis/game.repository.js"
import { KickVoteRepository } from "@/redis/kickVote.repository.js"
import { MessageRepository } from "@/redis/message.repository.js"
import type { GameSocket } from "../types/gameSocket.js"

export abstract class BaseService {
  protected redis = new GameRepository()
  protected kickVoteRepository = new KickVoteRepository()
  protected socketManager = SocketManager.getInstance()

  protected afkQueue: PlayerAfkQueueService =
    PlayerAfkQueueService.getInstance()
  protected revealCardsAfkQueue: RevealCardsAfkQueueService =
    RevealCardsAfkQueueService.getInstance()
  protected kickVoteExpirationQueue: KickVoteExpirationQueueService =
    KickVoteExpirationQueueService.getInstance()

  protected messageRepository = new MessageRepository()

  protected async sendMissingStatesToSocket(
    socket: GameSocket,
    game: Game,
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
    game: Game,
    stateManager: GameStateTracker,
    expectedVersion?: number,
  ) {
    const operations = stateManager.getChanges()
    if (!operations) return

    await this.redis.updateGame(game, operations, expectedVersion)

    this.socketManager.sendToRoom({
      room: game.code,
      event: "game:update",
      data: [operations],
    })
  }

  protected async getGame(gameCode: string) {
    const game = await this.redis.getGame(gameCode)

    game.setOperationManager(GameOperationManager.getInstance())

    return game
  }

  protected async joinGame(
    socket: GameSocket,
    game: Game,
    player: Player,
    reconnection: boolean = false,
  ) {
    await socket.join(game.code)

    socket.data = {
      gameCode: game.code,
      playerId: player.id,
    }

    this.socketManager.sendToSocket(socket, {
      event: "game:join",
      data: [game.code, game.status, player.id, player.getSessionId()],
    })

    const messageType = reconnection
      ? CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_RECONNECT
      : CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_JOINED
    await this.sendServerMessage(game.code, player.name, messageType)

    await this.redis.updateGame(game)
  }

  async sendServerMessage(
    gameCode: string,
    playerName: string,
    serverMessageType: ServerMessageType,
  ) {
    const message: ServerChatMessage = {
      id: crypto.randomUUID(),
      name: playerName,
      message: serverMessageType,
      type: serverMessageType,
    }

    await this.messageRepository.storeMessage(gameCode, message)

    this.socketManager.sendToRoom({
      room: gameCode,
      event: "message:server",
      data: [message],
    })
  }
}
