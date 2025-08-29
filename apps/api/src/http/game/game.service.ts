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
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
import { SocketManager } from "@/realtime/utils/SocketManager.js"
import { GameRepository } from "@/redis/game.repository.js"

const gameRepository = new GameRepository()
const socketManager = SocketManager.getInstance()

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
  playerId?: string,
): Promise<GameStatusResponse | null> {
  try {
    const game = await gameRepository.getGameSafe(gameCode)

    if (!game) {
      return null
    }

    let playerForfeited = false
    if (playerId) {
      const player = game.getPlayerById(playerId)
      if (player) {
        playerForfeited = player.forfeited
      }
    }

    const response: GameStatusResponse = {
      gameCode: game.code,
      status: game.status,
      connectedPlayersCount: game.getConnectedPlayers().length,
      isPrivate: game.settings.private,
      playerForfeited,
    }

    return response
  } catch (error) {
    Logger.error("Error getting game status:", { error, gameCode })
    throw error
  }
}

export async function kickPlayer(
  gameCode: string,
  playerId: string,
): Promise<void> {
  try {
    const game = await gameRepository.getGameSafe(gameCode)
    if (!game) {
      throw new Error("Game not found")
    }

    const player = game.getPlayerById(playerId)
    if (!player) {
      throw new Error("Player not found")
    }

    const socket = socketManager.getSocket(player.socketId)
    if (!socket) {
      throw new Error("Socket not found")
    }

    socketManager.sendToRoom({
      room: gameCode,
      event: "kick:report",
      data: [player.id, player.name],
    })

    // TODO REFACTOR THIS. THIS IS A COPY OF THE REALTIME KICK SERVICE + BASE SERVICE
    const operationManager = new GameStateTracker(game)

    await game.disconnectPlayer(player)

    const operations = operationManager.getChanges()
    if (!operations) return

    await gameRepository.updateGame(game, operations)

    socketManager.sendToRoom({
      room: game.code,
      event: "game:update",
      data: [operations],
    })

    Logger.info(
      `Player ${playerId} (${player.name}) kicked from game ${gameCode}`,
      {
        gameCode,
        playerId,
        playerName: player.name,
      },
    )
  } catch (error) {
    Logger.error("Error kicking player:", { error, gameCode, playerId })
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
