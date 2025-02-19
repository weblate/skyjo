import type { RevealCardsAfkQueueService } from "@/queues/RevealCardsAfkQueueService.js"
import { GameRepository } from "@/redis/game.repository.js"
import type { SocketManager } from "@/socketio/utils/SocketManager.js"
import { type GameOperationManagerInterface, Skyjo } from "@skyjo/core"
import type { Socket } from "socket.io"
import { PlayerAfkQueueService } from "../../queues/PlayerAfkQueueService.js"
import { GameStateTracker } from "./GameStateTracker.js"

export class GameOperationManager implements GameOperationManagerInterface {
  private redis?: GameRepository
  private playerAfkQueue?: PlayerAfkQueueService
  private revealCardsAfkQueue?: RevealCardsAfkQueueService
  private socketManager?: SocketManager

  constructor({
    redis,
    playerAfkQueue,
    revealCardsAfkQueue,
    socketManager,
  }: {
    redis?: GameRepository
    playerAfkQueue?: PlayerAfkQueueService
    revealCardsAfkQueue?: RevealCardsAfkQueueService
    socketManager?: SocketManager
  }) {
    this.redis = redis
    this.playerAfkQueue = playerAfkQueue
    this.revealCardsAfkQueue = revealCardsAfkQueue
    this.socketManager = socketManager
  }

  //#region game storage actions
  async removeGame(gameCode: string): Promise<void> {
    await this.redis?.removeGame(gameCode)
  }

  async updateGame(game: Skyjo): Promise<void> {
    await this.redis?.updateGame(game)
  }
  //#endregion

  //#region socket actions

  getSocket(socketId: string) {
    return this.socketManager?.getSocket(socketId)
  }

  async removeSocket(socket: Socket): Promise<void> {
    socket.leave(socket.data.gameCode)
    socket.emit("leave:success")
  }
  //#endregion

  //#region afk timer actions
  async startRevealCardsAfkTimer(game: Skyjo): Promise<void> {
    await this.revealCardsAfkQueue?.startTimer(game)
  }

  async startPlayerAfkTimer(game: Skyjo, playerId: string): Promise<void> {
    await this.playerAfkQueue?.startTimer(game, playerId)
  }

  async cancelPlayerAfkTimer(
    gameCode: string,
    playerId: string,
  ): Promise<void> {
    await this.playerAfkQueue?.cancelTimer(gameCode, playerId)
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

      await this.redis?.updateGame(game, operations)
      this.socketManager?.sendToRoom({
        room: game.code,
        event: "game:update",
        data: [operations],
      })
    }, ms)
  }
}
