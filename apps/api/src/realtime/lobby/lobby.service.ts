import { GameStartCountdownQueueService } from "@/queues/GameStartCountdownQueueService.js"
import { BaseService } from "@/realtime/base/base.service.js"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { type CreatePlayer, Game, Player, Settings } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { UpdateGameSettings } from "@skymo/shared/validations"

export class LobbyService extends BaseService {
  private readonly countdownQueue = GameStartCountdownQueueService.getInstance()

  async onCreate(
    socket: GameSocket,
    playerToCreate: CreatePlayer,
    isPrivateGame = true,
  ) {
    const { game, player } = await this.createGame(
      socket,
      playerToCreate,
      isPrivateGame,
    )

    await this.addPlayerToGame(socket, game, player)
    await this.joinGame(socket, game, player)
  }

  async onJoin(
    socket: GameSocket,
    gameCode: string,
    playerToCreate: CreatePlayer,
  ) {
    const game = await this.getGame(gameCode)

    const player = new Player(playerToCreate, socket.id, socket.user?.id)

    if (game.isPlayerBanned(player)) {
      throw new CError(`Player tried to join a game but is banned.`, {
        code: ErrorConstants.ERROR.PLAYER_BANNED,
        level: "info",
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: player.id,
          name: player.name,
        },
      })
    }

    await this.addPlayerToGame(socket, game, player)
    await this.joinGame(socket, game, player)
  }

  async onResetSettings(socket: GameSocket) {
    const game = await this.getGame(socket.data.gameCode)
    const stateManager = new GameStateTracker(game)

    if (!game.isHost(socket.data.playerId)) {
      throw new CError(
        `Player try to change all game settings but is not the host.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    if (game.settings.isConfirmed && !game.settings.private) {
      throw new CError(
        `Player try to reset game settings for a public game but the settings are already confirmed.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "warn",
        },
      )
    }

    game.settings = new Settings(
      game.settings.private,
      game.settings.maxPlayers,
    )
    game.updatedAt = new Date()

    await this.updateAndSendGame(game, stateManager)
  }

  async onUpdateMaxPlayers(socket: GameSocket, maxPlayers: number) {
    const game = await this.getGame(socket.data.gameCode)
    if (!game.isHost(socket.data.playerId)) {
      throw new CError(
        `Player try to change all game settings but is not the host.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    game.updatedAt = new Date()

    const stateManager = new GameStateTracker(game)

    game.settings.maxPlayers = maxPlayers
    game.updatedAt = new Date()

    await this.updateAndSendGame(game, stateManager)
  }

  async onUpdateSettings(socket: GameSocket, settings: UpdateGameSettings) {
    const game = await this.getGame(socket.data.gameCode)
    if (!game.isHost(socket.data.playerId)) {
      throw new CError(
        `Player try to change all game settings but is not the host.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    if (game.settings.isConfirmed && !game.settings.private) {
      throw new CError(
        `Player try to update game settings for a public game but the settings are already confirmed.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "warn",
        },
      )
    }

    const stateManager = new GameStateTracker(game)

    game.settings.updateSettings(settings)
    game.updatedAt = new Date()

    await this.updateAndSendGame(game, stateManager)
  }

  async onToggleSettingsValidation(socket: GameSocket) {
    const game = await this.getGame(socket.data.gameCode)
    if (game.settings.private) return

    const stateManager = new GameStateTracker(game)

    game.settings.isConfirmed = !game.settings.isConfirmed
    game.updatedAt = new Date()

    await this.updateAndSendGame(game, stateManager)
  }

  async onStartCountdown(socket: GameSocket) {
    const game = await this.getGame(socket.data.gameCode)
    if (!game.isHost(socket.data.playerId)) {
      throw new CError(`Player tried to start countdown but is not the host.`, {
        code: ErrorConstants.ERROR.NOT_ALLOWED,
        level: "warn",
        meta: {
          game: game.serialize(),
          socketId: socket.id,
          gameCode: game.code,
          playerId: socket.data.playerId,
        },
      })
    }

    if (await this.countdownQueue.coundownExists(game.code)) {
      throw new CError(`Countdown already exists.`, {
        code: ErrorConstants.ERROR.NOT_ALLOWED,
        level: "warn",
      })
    }

    await this.countdownQueue.startCountdown(game.code)
  }

  async onCancelCountdown(socket: GameSocket) {
    const game = await this.getGame(socket.data.gameCode)
    if (!game.isHost(socket.data.playerId)) {
      throw new CError(
        `Player tried to cancel countdown but is not the host.`,
        {
          code: ErrorConstants.ERROR.NOT_ALLOWED,
          level: "warn",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    await this.countdownQueue.cancelCountdown(game.code)
  }

  //#region private methods
  private async createGame(
    socket: GameSocket,
    playerToCreate: CreatePlayer,
    isPrivateGame: boolean,
  ) {
    const player = new Player(playerToCreate, socket.id, socket.user?.id)
    const game = new Game({
      hostId: player.id,
      settings: new Settings(isPrivateGame),
    })

    await this.redis.createGame(game)

    return { player, game }
  }

  private async addPlayerToGame(
    socket: GameSocket,
    game: Game,
    player: Player,
  ) {
    if (!game.isInLobby()) {
      throw new CError(
        `Player try to join a game but the game is not in the lobby.`,
        {
          code: ErrorConstants.ERROR.GAME_ALREADY_STARTED,
          level: "info",
          meta: {
            game: game.serialize(),
            socketId: socket.id,
            gameCode: game.code,
            playerId: socket.data.playerId,
          },
        },
      )
    }

    const stateManager = new GameStateTracker(game)

    game.addPlayer(player)
    game.updatedAt = new Date()

    await this.updateAndSendGame(game, stateManager)
  }
  //#endregion
}
