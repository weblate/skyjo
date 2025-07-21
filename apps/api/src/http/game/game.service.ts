import { constructTagArray, type Game, type Player } from "@skymo/core"
import { leaderboardView } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import type {
  GameStatusResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  PublicGame,
} from "@skymo/shared/types"
import { db } from "@/db/index.js"
import { GameRepository } from "@/redis/game.repository.js"

const gameRepository = new GameRepository()

export async function getRedisPublicGames(
  nbPerPage: number,
  page: number,
): Promise<PublicGame[]> {
  const games = await gameRepository.getPublicGames(nbPerPage, page)

  return parsePublicGames(games)
}

export async function getLeaderboard(
  limit: number = 10,
): Promise<LeaderboardResponse> {
  try {
    const results = await db.select().from(leaderboardView).limit(limit)

    const leaderboard: LeaderboardEntry[] = results.map((row) => ({
      rank: row.rank,
      userId: row.userId.toString(),
      name: row.name ?? "",
      username: row.username ?? "",
      avatar: row.avatar,
      wins: Number(row.wins),
      totalGames: Number(row.totalGames),
      winRate: Number(row.winRate),
    }))

    const response: LeaderboardResponse = {
      leaderboard,
      lastUpdated: new Date().toISOString(),
    }

    return response
  } catch (error) {
    Logger.error("Error getting leaderboard:", { error })
    throw error
  }
}

export async function getGameStatus(
  gameCode: string,
): Promise<GameStatusResponse | null> {
  try {
    const game = await gameRepository.getGameSafe(gameCode)

    if (!game) {
      return null
    }

    const response: GameStatusResponse = {
      gameCode: game.code,
      status: game.status,
      connectedPlayersCount: game.getConnectedPlayers().length,
    }

    return response
  } catch (error) {
    Logger.error("Error getting game status:", { error, gameCode })
    throw error
  }
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
