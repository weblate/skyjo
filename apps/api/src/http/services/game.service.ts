import { GameRepository } from "@/redis/game.repository.js"
import type { Game, Player } from "@skymo/core"
import type { PublicGame, PublicGameTag } from "@skymo/shared/types"

export class GameService {
  private readonly gameRepository = new GameRepository()

  async getPublicGames(nbPerPage: number, page: number): Promise<PublicGame[]> {
    const games = await this.gameRepository.getPublicGames(nbPerPage, page)

    return this.parsePublicGames(games)
  }

  //#region private methods
  private constructTagArray(game: Game) {
    const tags: PublicGameTag[] = []

    if (game.settings.isClassicSettings()) tags.push("classic")
    if (game.settings.removeIdenticalRow) tags.push("row")
    if (game.settings.removeIdenticalColumn) tags.push("column")
    if (game.settings.scoreToEndGame > 100) tags.push("long-game")
    if (game.settings.scoreToEndGame < 100) tags.push("short-game")

    return tags
  }

  private parsePublicGamePlayers(players: Player[]): PublicGame["players"] {
    return players.map((p) => ({ id: p.id, avatar: p.avatar, name: p.name }))
  }

  private parsePublicGame(game: Game): PublicGame {
    return {
      code: game.code,
      hostName: game.players.find((p) => game.isHost(p.id))?.name ?? "",
      players: this.parsePublicGamePlayers(game.players),
      maxPlayers: game.settings.maxPlayers,
      tags: this.constructTagArray(game),
    }
  }

  private parsePublicGames(games: Game[]): PublicGame[] {
    return games.map((game) => this.parsePublicGame(game))
  }
  //#endregion
}
