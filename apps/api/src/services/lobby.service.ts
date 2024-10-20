import { Skyjo } from "@/class/Skyjo.js"
import { SkyjoPlayer } from "@/class/SkyjoPlayer.js"
import { SkyjoSettings } from "@/class/SkyjoSettings.js"
import { BaseService } from "@/services/base.service.js"
import type { SkyjoSocket } from "@/types/skyjoSocket.js"
import { CError } from "@/utils/CError.js"
import { ERROR, GAME_STATUS } from "shared/constants"
import type { ChangeSettings } from "shared/validations/changeSettings"
import type { CreatePlayer } from "shared/validations/player"

export class LobbyService extends BaseService {
  private readonly MAX_GAME_INACTIVE_TIME = 300000 // 5 minutes
  private readonly BASE_NEW_GAME_CHANCE = 0.05 // 5%
  private readonly MAX_NEW_GAME_CHANCE = 0.2 // 20%
  private readonly IDEAL_LOBBY_GAME_COUNT = 3 // Number of lobby wanted at the same time

  async onCreate(
    socket: SkyjoSocket,
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
    socket: SkyjoSocket,
    gameCode: string,
    playerToCreate: CreatePlayer,
  ) {
    const game = await this.getGame(gameCode)

    const player = new SkyjoPlayer(playerToCreate, socket.id)

    await this.addPlayerToGame(socket, game, player)
    await this.joinGame(socket, game, player)
  }

  async onFind(socket: SkyjoSocket, playerToCreate: CreatePlayer) {
    const game = await this.getPublicGameWithFreePlace()

    if (!game) {
      await this.onCreate(socket, playerToCreate, false)
    } else {
      await this.onJoin(socket, game.code, playerToCreate)
    }
  }

  async onSettingsChange(socket: SkyjoSocket, settings: ChangeSettings) {
    const game = await this.getGame(socket.data.gameCode)
    if (!game.isAdmin(socket.data.playerId)) {
      throw new CError(
        `Player try to change game settings but is not the admin.`,
        {
          code: ERROR.NOT_ALLOWED,
          level: "warn",
          meta: { game, gameCode: game.code, playerId: socket.data.playerId },
        },
      )
    }

    game.settings.changeSettings(settings)
    game.updatedAt = new Date()

    const updateSettings = BaseService.gameDb.updateSettings(
      game.id,
      game.settings,
    )
    const broadcast = this.broadcastGame(socket, game)

    await Promise.all([updateSettings, broadcast])
  }

  async onGameStart(socket: SkyjoSocket) {
    const game = await this.getGame(socket.data.gameCode)
    if (!game.isAdmin(socket.data.playerId)) {
      throw new CError(`Player try to start the game but is not the admin.`, {
        code: ERROR.NOT_ALLOWED,
        level: "warn",
        meta: { game, gameCode: game.code, playerId: socket.data.playerId },
      })
    }

    game.start()

    const updateGame = BaseService.gameDb.updateGame(game)
    const broadcast = this.broadcastGame(socket, game)

    await Promise.all([updateGame, broadcast])
  }

  //#region private methods
  private async createGame(
    socket: SkyjoSocket,
    playerToCreate: CreatePlayer,
    isprotectedGame: boolean,
  ) {
    const player = new SkyjoPlayer(playerToCreate, socket.id)
    const game = new Skyjo(player.id, new SkyjoSettings(isprotectedGame))
    BaseService.games.push(game)
    await BaseService.gameDb.createGame(game)

    return { player, game }
  }

  private async getPublicGameWithFreePlace() {
    const now = new Date().getTime()

    const eligibleGames = BaseService.games.filter((game) => {
      const hasRecentActivity =
        now - game.updatedAt.getTime() < this.MAX_GAME_INACTIVE_TIME

      return (
        !game.settings.private &&
        game.status === GAME_STATUS.LOBBY &&
        !game.isFull() &&
        hasRecentActivity
      )
    })

    // Adjust new game chance based on number of eligible games
    const missingLobbyGameCount = Math.max(
      0,
      this.IDEAL_LOBBY_GAME_COUNT - eligibleGames.length,
    )
    const additionalChance = this.BASE_NEW_GAME_CHANCE * missingLobbyGameCount
    const newGameChance = Math.min(
      this.MAX_NEW_GAME_CHANCE,
      this.BASE_NEW_GAME_CHANCE + additionalChance,
    )

    const shouldCreateNewGame =
      Math.random() < newGameChance || eligibleGames.length === 0
    if (shouldCreateNewGame) return null

    const randomGameIndex = Math.floor(Math.random() * eligibleGames.length)
    return eligibleGames[randomGameIndex]
  }

  private async addPlayerToGame(
    socket: SkyjoSocket,
    game: Skyjo,
    player: SkyjoPlayer,
  ) {
    if (game.status !== GAME_STATUS.LOBBY) {
      throw new CError(
        `Player try to join a game but the game is not in the lobby.`,
        {
          code: ERROR.GAME_ALREADY_STARTED,
          level: "warn",
          meta: { game, gameCode: game.code, playerId: player.id },
        },
      )
    }

    game.addPlayer(player)
    const createPlayer = BaseService.playerDb.createPlayer(
      game.id,
      socket.id,
      player,
    )
    game.updatedAt = new Date()
    const updateGame = BaseService.gameDb.updateGame(game, false)

    await Promise.all([createPlayer, updateGame])
  }
  //#endregion
}
