import type { PlayerScore } from "@skymo/core"
import { gameTable, playerTable, scoreTable } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import type { GameStorageJobData } from "@skymo/worker-types"
import { eq } from "drizzle-orm"
import { db } from "@/postgres.js"

type PlayerRedisDb = GameStorageJobData["game"]["players"][0]
type PlayerWithRank = PlayerRedisDb & { rank: number }

type DatabaseTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

type PlayerRecord = {
  id: number
  name: string
}

type ScoreInsert = {
  gameId: number
  playerId: number
  score: PlayerScore
  round: number
}

export class GameStorageTask {
  public static async storeGame(jobData: GameStorageJobData): Promise<void> {
    const { game } = jobData

    Logger.info(`Starting storage for game ${game.code}`, {
      gameCode: game.code,
      gameId: game.id,
      playerCount: game.players.length,
    })

    try {
      await db.transaction(async (tx) => {
        // Insert the game record
        const gameRecords = await tx
          .insert(gameTable)
          .values({
            code: game.code,
            settings: game.settings,
            createdAt: new Date(game.createdAt),
          })
          .returning({ id: gameTable.id })

        if (!gameRecords || gameRecords.length === 0) {
          throw new Error("Failed to insert game record")
        }

        const gameDbId = gameRecords[0]!.id

        if (game.players.length === 0) {
          Logger.info(`No players to store for game ${game.code}`)
          return
        }

        // Calculate player ranks and insert player records
        const playersWithRanks = this.calculatePlayerRanks(game.players)
        const minScore = Math.min(...game.players.map((p) => p.score))

        const playerInserts = playersWithRanks.map((player) => ({
          gameId: gameDbId,
          userId: player.userId,
          avatar: player.avatar,
          name: player.name,
          score: player.score,
          rank: player.rank,
          connectionStatus: player.connectionStatus,
          winner: player.score === minScore,
        }))

        const playerRecords = await tx
          .insert(playerTable)
          .values(playerInserts)
          .returning({ id: playerTable.id, name: playerTable.name })

        // Update game with host ID
        await this.updateGameHostId(
          tx,
          gameDbId,
          game.hostId,
          playersWithRanks,
          playerRecords,
        )

        // Insert player scores
        const scoreCount = await this.insertPlayerScores(
          tx,
          gameDbId,
          playersWithRanks,
          playerRecords,
        )

        Logger.info(
          `Successfully stored game ${game.code} with ${playerRecords.length} players`,
          {
            gameCode: game.code,
            gameDbId,
            playerCount: playerRecords.length,
            scoreCount,
          },
        )
      })
    } catch (error) {
      Logger.error(`Error storing game ${game.code}`, {
        gameCode: game.code,
        gameId: game.id,
        error,
      })
      throw error
    }
  }

  private static calculatePlayerRanks(
    players: PlayerRedisDb[],
  ): PlayerWithRank[] {
    const sortedPlayers = [...players].sort((a, b) => a.score - b.score)

    return sortedPlayers.map((player) => {
      let rank = 1
      // Find rank by counting how many players have a better (lower) score
      for (const otherPlayer of sortedPlayers) {
        if (otherPlayer.score < player.score) {
          rank++
        }
      }
      return { ...player, rank }
    })
  }

  private static async updateGameHostId(
    tx: DatabaseTransaction,
    gameDbId: number,
    hostId: string,
    playersWithRanks: PlayerWithRank[],
    playerRecords: PlayerRecord[],
  ): Promise<void> {
    const hostPlayerIndex = playersWithRanks.findIndex(
      (player) => player.id === hostId,
    )

    if (hostPlayerIndex !== -1) {
      await tx
        .update(gameTable)
        .set({ hostId: playerRecords[hostPlayerIndex]!.id })
        .where(eq(gameTable.id, gameDbId))
    }
  }

  private static async insertPlayerScores(
    tx: DatabaseTransaction,
    gameDbId: number,
    playersWithRanks: PlayerWithRank[],
    playerRecords: PlayerRecord[],
  ): Promise<number> {
    const scoreInserts: ScoreInsert[] = []

    for (
      let playerIndex = 0;
      playerIndex < playersWithRanks.length;
      playerIndex++
    ) {
      const player = playersWithRanks[playerIndex]
      const playerRecord = playerRecords[playerIndex]

      if (playerRecord && player) {
        for (let round = 0; round < player.scores.length; round++) {
          const roundScore = player.scores[round]
          if (roundScore !== undefined) {
            scoreInserts.push({
              gameId: gameDbId,
              playerId: playerRecord.id,
              score: roundScore,
              round: round + 1,
            })
          }
        }
      }
    }

    if (scoreInserts.length > 0) {
      await tx.insert(scoreTable).values(scoreInserts)
    }

    return scoreInserts.length
  }
}
