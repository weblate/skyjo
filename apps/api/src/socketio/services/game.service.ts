import type { SkyjoSocket } from "@/socketio/types/skyjoSocket.js"
import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import {
  Constants as CoreConstants,
  type PlayPickCard,
  type PlayReplaceCard,
  type PlayRevealCard,
  type PlayTurnCard,
  type TurnStatus,
} from "@skyjo/core"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import { BaseService } from "./base.service.js"

export class GameService extends BaseService {
  async onGet(
    socket: SkyjoSocket,
    clientStateVersion: number | null,
    firstTime: boolean = false,
  ) {
    // TODO add trycatch and send error get if game not found to redirect the client to the homepage with a toast to explain the error
    // Leave the checkStateVersion check if client really needs to get the game
    await this.checkStateVersion(socket, clientStateVersion, firstTime)
  }

  async onRevealCard(
    socket: SkyjoSocket,
    turnData: PlayRevealCard,
    clientStateVersion: number,
  ) {
    await this.checkStateVersion(socket, clientStateVersion)

    const { column, row } = turnData
    const gameCode = socket.data.gameCode

    const game = await this.getGame(gameCode)

    if (game.processingAfk) {
      throw new CError(`Game is processing AFK.`, {
        code: ErrorConstants.ERROR.NOT_ALLOWED,
        shouldLog: false,
      })
    }

    const stateManager = new GameStateTracker(game)

    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`Player try to reveal a card but is not found.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        meta: {
          game,
          socket,

          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    await game.revealCard({ player, column, row })

    await this.updateAndSendGame(game, stateManager)
  }

  async onPickCard(
    socket: SkyjoSocket,
    { pile }: PlayPickCard,
    clientStateVersion: number,
  ) {
    await this.checkStateVersion(socket, clientStateVersion)

    const { game } = await this.checkPlayAuthorization(socket, [
      CoreConstants.TURN_STATUS.CHOOSE_A_PILE,
    ])
    const stateManager = new GameStateTracker(game)

    if (pile === "draw") game.drawCard()
    else game.pickFromDiscard()

    await this.updateAndSendGame(game, stateManager)
  }

  async onReplaceCard(
    socket: SkyjoSocket,
    { column, row }: PlayReplaceCard,
    clientStateVersion: number,
  ) {
    await this.checkStateVersion(socket, clientStateVersion)

    const { game } = await this.checkPlayAuthorization(socket, [
      CoreConstants.TURN_STATUS.REPLACE_A_CARD,
      CoreConstants.TURN_STATUS.THROW_OR_REPLACE,
    ])
    const stateManager = new GameStateTracker(game)

    await game.replaceCard({ column, row })

    await this.updateAndSendGame(game, stateManager)
  }

  async onDiscardCard(socket: SkyjoSocket, clientStateVersion: number) {
    await this.checkStateVersion(socket, clientStateVersion)

    const { game } = await this.checkPlayAuthorization(socket, [
      CoreConstants.TURN_STATUS.THROW_OR_REPLACE,
    ])
    const stateManager = new GameStateTracker(game)

    game.discardCard(game.selectedCardValue!)

    await this.updateAndSendGame(game, stateManager)
  }

  async onTurnCard(
    socket: SkyjoSocket,
    { column, row }: PlayTurnCard,
    clientStateVersion: number,
  ) {
    await this.checkStateVersion(socket, clientStateVersion)

    const { game, player } = await this.checkPlayAuthorization(socket, [
      CoreConstants.TURN_STATUS.TURN_A_CARD,
    ])
    const stateManager = new GameStateTracker(game)

    await game.turnCard({ player, column, row })

    await this.updateAndSendGame(game, stateManager)
  }

  async onReplay(socket: SkyjoSocket, clientStateVersion: number) {
    await this.checkStateVersion(socket, clientStateVersion)

    const game = await this.getGame(socket.data.gameCode)
    if (!game.isFinished() && !game.isStopped()) {
      throw new CError(
        `Player try to replay but the game is not finished. This error should never happen.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          meta: {
            game,
            socket,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }
    const stateManager = new GameStateTracker(game)

    await game.togglePlayerReplay(socket.data.playerId)

    await this.updateAndSendGame(game, stateManager)
  }

  //#region private methods
  private async checkStateVersion(
    socket: SkyjoSocket,
    clientStateVersion: number | null,
    firstTime: boolean = false,
  ) {
    const game = await this.getGame(socket.data.gameCode)

    if (clientStateVersion === null) {
      this.socketManager.sendGameToSocket(socket.id, game)

      if (firstTime) return

      throw new CError(
        "Client state version is null. This should never happen. Sent full state update",
        {
          code: ErrorConstants.ERROR.STATE_VERSION_NULL,
          meta: {
            gameCode: game.code,
            serverStateVersion: game.stateVersion,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    if (clientStateVersion > game.stateVersion) {
      this.socketManager.sendGameToSocket(socket.id, game)

      throw new CError(
        "Client state version is ahead of server. This should never happen. Sent full state update",
        {
          code: ErrorConstants.ERROR.STATE_VERSION_AHEAD,
          meta: {
            clientStateVersion,
            serverStateVersion: game.stateVersion,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    if (clientStateVersion < game.stateVersion) {
      await this.sendMissingStatesToSocket(socket, game, clientStateVersion)

      throw new CError(
        "Client state is behind server, sent full state update",
        {
          code: ErrorConstants.ERROR.STATE_VERSION_BEHIND,
          level: "warn",
          meta: {
            clientStateVersion,
            serverStateVersion: game.stateVersion,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }
  }

  private async checkPlayAuthorization(
    socket: SkyjoSocket,
    allowedStates: TurnStatus[],
  ) {
    const game = await this.getGame(socket.data.gameCode)

    if (game.processingAfk) {
      throw new CError(`Game is processing AFK.`, {
        code: ErrorConstants.ERROR.NOT_ALLOWED,
        shouldLog: false,
      })
    }

    // TODO remove this condition in 1.36.0 if game sync works and this error never happens in last versions
    if (
      !game.isPlaying() ||
      (!game.isRoundInMain() && !game.isRoundInLastLap())
    ) {
      this.socketManager.sendGameToSocket(socket.id, game)
      throw new CError(
        `Player try to play but the game is not in playing state. This should not happen since the game sync was normally checked before. Sent game to the player to fix the issue.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "error",
          meta: {
            game,
            socket,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    const player = game.getPlayerById(socket.data.playerId)
    if (!player) {
      throw new CError(`Player try to play but is not found.`, {
        code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        meta: {
          game,
          socket,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    // TODO remove this condition in 1.36.0 if game sync works and this error never happens in last versions
    if (!game.checkTurn(player.id)) {
      this.socketManager.sendGameToSocket(socket.id, game)
      throw new CError(
        `Player try to play but it's not his turn. This should not happen since the game sync was normally checked before. Sent game to the player to fix the issue.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "error",
          meta: {
            game,
            socket,
            player,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    // TODO remove this condition in 1.36.0 if game sync works and this error never happens in last versions
    if (allowedStates.length > 0 && !allowedStates.includes(game.turnStatus)) {
      this.socketManager.sendGameToSocket(socket.id, game)
      throw new CError(
        `Player try to play but the game is not in the allowed turn state. This should not happen since the game sync was normally checked before. Sent game to the player to fix the issue.`,
        {
          code: ErrorConstants.ERROR.INVALID_TURN_STATE,
          level: "error",
          meta: {
            game,
            socket,
            player,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    return { player, game }
  }
  //#endregion
}
