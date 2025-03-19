import { RevealCardsAfkQueueService } from "@/queues/RevealCardsAfkQueueService.js"
import { GameRepository } from "@/redis/game.repository.js"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import { Game, type GameOperationManagerInterface } from "@skymo/core"
import type { Socket } from "socket.io"
import { PlayerAfkQueueService } from "../../queues/PlayerAfkQueueService.js"
import { GameStateTracker } from "./GameStateTracker.js"

export class GameOperationManager implements GameOperationManagerInterface {
  private static instance: GameOperationManager

  private readonly redis?: GameRepository
  private readonly playerAfkQueue?: PlayerAfkQueueService
  private readonly revealCardsAfkQueue?: RevealCardsAfkQueueService
  private readonly socketManager?: SocketManager

  constructor() {
    this.redis = new GameRepository()
    this.playerAfkQueue = PlayerAfkQueueService.getInstance()
    this.revealCardsAfkQueue = RevealCardsAfkQueueService.getInstance()
    this.socketManager = SocketManager.getInstance()
  }

  public static getInstance(): GameOperationManager {
    if (!GameOperationManager.instance) {
      GameOperationManager.instance = new GameOperationManager()
    }
    return GameOperationManager.instance
  }

  //#region game storage actions
  async removeGame(gameCode: string): Promise<void> {
    await this.redis?.removeGame(gameCode)
  }

  async updateGame(game: Game): Promise<void> {
    await this.redis?.updateGame(game)
  }
  //#endregion

  //#region socket actions

  getSocket(socketId: string) {
    return this.socketManager?.getSocket(socketId)
  }

  async kickSocket(socket: Socket): Promise<void> {
    socket.leave(socket.data.gameCode)
  }
  //#endregion

  //#region afk timer actions
  async startRevealCardsAfkTimer(game: Game): Promise<void> {
    await this.revealCardsAfkQueue?.startTimer(game)
  }

  async cancelRevealCardsAfkTimer(gameCode: string): Promise<void> {
    await this.revealCardsAfkQueue?.cancelTimer(gameCode)
  }

  async startPlayerAfkTimer(game: Game, playerId: string): Promise<void> {
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
    game: Game,
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
