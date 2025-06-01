import { db } from "@/postgres.js"
import { gameTable, playerTable, scoreTable } from "@skymo/database/schema"
import { Logger } from "@skymo/logger"
import type { GameStorageJobData } from "@skymo/worker-types"

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

        // Insert player records
        const playerInserts = players.map((player) => ({
          gameId: gameDbId,
          userId: player.userId,
          avatar: player.avatar,
          username: player.name,
          score: player.score,
          connectionStatus: player.connectionStatus,
          winner: player.score === minScore ? true : false,
        }))

        const playerRecords = await tx
          .insert(playerTable)
          .values(playerInserts)
          .returning({ id: playerTable.id, username: playerTable.username })

        // Insert scores for each player
        const scoreInserts = []

        for (let playerIndex = 0; playerIndex < players.length; playerIndex++) {
          const player = players[playerIndex]
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
