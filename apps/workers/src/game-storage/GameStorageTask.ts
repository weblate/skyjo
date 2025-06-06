import { db } from "@/postgres.js"
import { gameTable, playerTable, scoreTable } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import type { GameStorageJobData } from "@skymo/worker-types"
import { eq } from "drizzle-orm"

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

        const gameRecord = gameRecords[0]
        if (!gameRecord) {
          throw new Error("No game record returned from insert")
        }

        const gameDbId = gameRecord.id

        // Store all players who participated in the game
        const players = game.players

        if (players.length === 0) {
          Logger.info(`No players to store for game ${game.code}`)
          return
        }

        const minScore =
          players.length > 0 ? Math.min(...players.map((p) => p.score)) : 0

        // Sort players by score to calculate ranks (lower score = better rank)
        const sortedPlayers = [...players].sort((a, b) => a.score - b.score)

        // Calculate ranks (handle ties by giving the same rank)
        const playersWithRanks = sortedPlayers.map((player, _index) => {
          let rank = 1
          // Find rank by counting how many players have a better (lower) score
          for (let i = 0; i < sortedPlayers.length; i++) {
            const otherPlayer = sortedPlayers[i]
            if (otherPlayer && otherPlayer.score < player.score) {
              rank++
            }
          }
          return { ...player, rank }
        })

        // Insert player records
        const playerInserts = playersWithRanks.map((player) => ({
          gameId: gameDbId,
          userId: player.userId,
          avatar: player.avatar,
          name: player.name,
          score: player.score,
          rank: player.rank,
          connectionStatus: player.connectionStatus,
          winner: player.score === minScore ? true : false,
        }))

        const playerRecords = await tx
          .insert(playerTable)
          .values(playerInserts)
          .returning({ id: playerTable.id, name: playerTable.name })

        // Update game record with hostId based on game.hostId
        const hostPlayerIndex = playersWithRanks.findIndex(
          (player) => player.id === game.hostId,
        )

        if (hostPlayerIndex !== -1 && playerRecords[hostPlayerIndex]) {
          await tx
            .update(gameTable)
            .set({ hostId: playerRecords[hostPlayerIndex].id })
            .where(eq(gameTable.id, gameDbId))
        }

        // Insert scores for each player
        const scoreInserts = []

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
                  score: roundScore.toString(),
                  round: round + 1,
                })
              }
            }
          }
        }

        if (scoreInserts.length > 0) {
          await tx.insert(scoreTable).values(scoreInserts)
        }

        Logger.info(
          `Successfully stored game ${game.code} with ${playerRecords.length} players`,
          {
            gameCode: game.code,
            gameDbId,
            playerCount: playerRecords.length,
            scoreCount: scoreInserts.length,
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
}
