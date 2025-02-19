import { GameRepository } from "@/redis/game.repository.js"
import type { SocketManager } from "@/socketio/utils/SocketManager.js"
import { type GameOperationManagerInterface, Skyjo } from "@skyjo/core"
import type { Socket } from "socket.io"
import { AfkQueueService } from "../../queues/AfkQueueService.js"
import { GameStateTracker } from "./GameStateTracker.js"

export class GameOperationManager implements GameOperationManagerInterface {
  constructor(
    private readonly redis: GameRepository,
    private readonly afkQueue: AfkQueueService,
    private readonly socketManager: SocketManager,
  ) {}

  //#region game storage actions
  async removeGame(gameCode: string): Promise<void> {
    await this.redis.removeGame(gameCode)
  }

  async updateGame(game: Skyjo): Promise<void> {
    await this.redis.updateGame(game)
  }
  //#endregion

  //#region socket actions

  getSocket(socketId: string) {
    return this.socketManager.getSocket(socketId)
  }

  async removeSocket(socket: Socket): Promise<void> {
    socket.leave(socket.data.gameCode)
    socket.emit("leave:success")
  }
  //#endregion

  //#region afk timer actions
  async startAfkTimer(game: Skyjo, playerId: string): Promise<void> {
    await this.afkQueue.startTimer(game, playerId)
  }

  async cancelAfkTimer(gameCode: string, playerId: string): Promise<void> {
    await this.afkQueue.cancelTimer(gameCode, playerId)
  }
  //#endregion

  async delayNewRound(
    game: Skyjo,
    callback: () => Promise<void>,
    ms: number,
  ): Promise<void> {
    setTimeout(async () => {
      const stateManager = new GameStateTracker(game)

      await callback()

      const operations = stateManager.getChanges()
      if (!operations) return

      await this.redis.updateGame(game, operations)
      this.socketManager.sendToRoom({
        room: game.code,
        event: "game:update",
        data: [operations],
      })
    }, ms)
  }
}
