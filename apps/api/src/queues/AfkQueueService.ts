import { GameRepository } from "@/redis/game.repository.js"
import type { SkyjoSocket } from "@/socketio/types/skyjoSocket.js"
import { GameOperationManager } from "@/socketio/utils/GameOperationManager.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import type { Skyjo, SkyjoPlayer } from "@skyjo/core"
import { Constants as CoreConstants } from "@skyjo/core"
import { BaseQueueService } from "./BaseQueueService.js"
export type AfkJobData = {
  gameCode: string
  playerId: string
}

export class AfkQueueService extends BaseQueueService<AfkJobData> {
  protected redis = new GameRepository()
  protected socketManager = SocketManager.getInstance()

  constructor() {
    super("afk-timer", {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 1000,
        },
      },
    })
  }

  public async startTimer(game: Skyjo, playerId: string): Promise<void> {
    const timeoutDuration = game.settings.private
      ? CoreConstants.AFK_TIMEOUT.PRIVATE
      : CoreConstants.AFK_TIMEOUT.PUBLIC

    const jobId = this.getJobId(game.code, playerId)

    await this.queue.add(
      jobId,
      {
        gameCode: game.code,
        playerId: playerId,
      },
      {
        delay: timeoutDuration,
        jobId,
        removeOnComplete: true,
        removeOnFail: true,
      },
    )
  }

  public async cancelTimer(gameCode: string, playerId: string): Promise<void> {
    const jobId = this.getJobId(gameCode, playerId)
    await this.queue.remove(jobId)
  }

  async processJob(data: AfkJobData) {
    const { gameCode, playerId } = data

    const game = await this.redis.getGame(gameCode)
    game.setOperationManager(
      new GameOperationManager(this.redis, this, this.socketManager),
    )

    const player = game.getPlayerById(playerId)
    if (!player) return

    const currentPlayer = game.getCurrentPlayer()
    if (currentPlayer?.id !== playerId) return

    player.afkCount++
    player.consecutiveAfkCount++

    if (
      player.consecutiveAfkCount >= CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE ||
      player.afkCount >= CoreConstants.AFK_TIMEOUT.MAX_TOTAL
    ) {
      await this.handlePlayerDisconnection(game, player)
    } else {
      await this.performAfkMove(game)
    }
  }

  //#region private methods

  private async updateAndSendGame(game: Skyjo, stateManager: GameStateTracker) {
    const operations = stateManager.getChanges()
    if (!operations) return

    await this.redis.updateGame(game, operations)
    this.socketManager.sendToRoom({
      room: game.code,
      event: "game:update",
      data: [operations],
    })
  }

  private getJobId(gameCode: string, playerId: string): string {
    return `afk:${gameCode}:${playerId}`
  }

  private async kickSocket(socket: SkyjoSocket) {
    // TODO send un kick plutôt
    socket.leave(socket.data.gameCode)
    socket.emit("leave:success")
  }

  // TODO bouger dans skyjo la logique de jeu ?
  private async handlePlayerDisconnection(game: Skyjo, player: SkyjoPlayer) {
    const stateManager = new GameStateTracker(game)

    player.connectionStatus = CoreConstants.CONNECTION_STATUS.DISCONNECTED

    if (game.isAdmin(player.id)) game.changeAdmin()

    const socket = this.socketManager.getSocket(player.id)
    if (!socket) return
    await this.kickSocket(socket)

    if (!game.isPlaying()) {
      game.removePlayer(player.id)

      await this.updateAndSendGame(game, stateManager)
      return
    }

    if (!game.hasMinPlayersConnected()) {
      game.status = CoreConstants.GAME_STATUS.STOPPED

      await this.updateAndSendGame(game, stateManager)
      await this.redis.removeGame(game.code)
      return
    }

    await this.updateAndSendGame(game, stateManager)
  }

  private async performAfkMove(game: Skyjo) {
    if (game.isRoundTurningCards()) {
      await this.performAfkMoveInTurningCards(game)
    } else if (game.isRoundInMain() || game.isRoundInLastLap()) {
      await this.performDefaultAfkMove(game)
    }
  }

  private async performAfkMoveInTurningCards(game: Skyjo) {
    const stateManager = new GameStateTracker(game)

    const currentPlayer = game.getCurrentPlayer()
    const initialTurnedCount = game.settings.initialTurnedCount

    while (!currentPlayer.hasRevealedCardCount(initialTurnedCount)) {
      const cardToRevealCoords = currentPlayer.getFirstCardNotVisible()
      if (!cardToRevealCoords) break

      game.revealCard(
        currentPlayer,
        cardToRevealCoords.column,
        cardToRevealCoords.row,
      )
    }

    await this.updateAndSendGame(game, stateManager)
  }

  private async performDefaultAfkMove(game: Skyjo) {
    const stateManager = new GameStateTracker(game)

    const currentPlayer = game.getCurrentPlayer()

    game.drawCard()

    await this.updateAndSendGame(game, stateManager)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const randomCol = Math.floor(Math.random() * currentPlayer.cards.length)
    const randomRow = Math.floor(Math.random() * currentPlayer.cards[0].length)

    game.replaceCard(randomCol, randomRow)

    await game.finishTurn(true)

    await this.updateAndSendGame(game, stateManager)
  }
  //#endregion
}
