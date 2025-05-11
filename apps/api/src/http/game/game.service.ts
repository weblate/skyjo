import { GameRepository } from "@/redis/game.repository.js"
import type { Game, Player } from "@skymo/core"
import type { PublicGame, PublicGameTag } from "@skymo/shared/types"

const gameRepository = new GameRepository()

export async function getRedisPublicGames(
  nbPerPage: number,
  page: number,
): Promise<PublicGame[]> {
  const games = await gameRepository.getPublicGames(nbPerPage, page)

  return parsePublicGames(games)
}

//#region private methods
function constructTagArray(game: Game) {
  const tags: PublicGameTag[] = []

  if (game.settings.isClassicSettings()) tags.push("classic")
  if (game.settings.removeIdenticalRow) tags.push("row")
  if (game.settings.removeIdenticalColumn) tags.push("column")
  if (game.settings.scoreToEndGame > 100) tags.push("long-game")
  if (game.settings.scoreToEndGame < 100) tags.push("short-game")

  return tags
}

function parsePublicGamePlayers(players: Player[]): PublicGame["players"] {
  return players.map((p) => ({ id: p.id, avatar: p.avatar, name: p.name }))
}

function parsePublicGame(game: Game): PublicGame {
  return {
    code: game.code,
    hostName: game.players.find((p) => game.isHost(p.id))?.name ?? "",
    players: parsePublicGamePlayers(game.players),
    maxPlayers: game.settings.maxPlayers,
    tags: constructTagArray(game),
  }
}

function parsePublicGames(games: Game[]): PublicGame[] {
  return games.map((game) => parsePublicGame(game))
}
//#endregion
