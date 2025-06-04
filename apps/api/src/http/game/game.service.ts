import { GameRepository } from "@/redis/game.repository.js"
import { type Game, type Player, constructTagArray } from "@skymo/core"
import type { PublicGame } from "@skymo/shared/types"

const gameRepository = new GameRepository()

export async function getRedisPublicGames(
  nbPerPage: number,
  page: number,
): Promise<PublicGame[]> {
  const games = await gameRepository.getPublicGames(nbPerPage, page)

  return parsePublicGames(games)
}

//#region private methods
function parsePublicGamePlayers(players: Player[]): PublicGame["players"] {
  return players.map((p) => ({ id: p.id, avatar: p.avatar, name: p.name }))
}

function parsePublicGame(game: Game): PublicGame {
  return {
    code: game.code,
    hostName: game.players.find((p) => game.isHost(p.id))?.name ?? "",
    players: parsePublicGamePlayers(game.players),
    maxPlayers: game.settings.maxPlayers,
    tags: constructTagArray(game.settings),
  }
}

function parsePublicGames(games: Game[]): PublicGame[] {
  return games.map((game) => parsePublicGame(game))
}
//#endregion
