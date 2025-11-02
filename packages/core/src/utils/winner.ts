import { Constants } from "../constants.js"
import type { PlayerToJson } from "../types/player.js"

/**
 * Sorts players into winners (lowest score, sorted by name) and losers (higher scores, sorted by score).
 */
const sortPlayers = (
  players: PlayerToJson[],
  winningScore: number,
): PlayerToJson[] => {
  const winners = players
    .filter((p) => p.score === winningScore)
    .sort((a, b) => a.name.localeCompare(b.name))

  const losers = players
    .filter((p) => p.score !== winningScore)
    .sort((a, b) => a.score - b.score)

  return [...winners, ...losers]
}

/**
 * Calculates player ranks based on their scores and connection status.
 * - Connected players are ranked before disconnected players
 * - Players with the lowest score (winners) are ranked first
 * - In the first round (when no rounds completed), all players get rank "-"
 * - After the first round, players get numerical ranks (1, 2, 3, etc.)
 *
 * @param players - Array of players to rank
 * @returns Object mapping player IDs to their ranks (number or "-")
 */
export const getPlayerRanks = (
  players: PlayerToJson[],
): Record<string, number | string> => {
  if (players.length === 0) {
    return {}
  }

  const nbRounds = players[0].scores.length
  const winningScore = Math.min(...players.map((p) => p.score))

  const connectedPlayers = players.filter(
    (player) =>
      player.connectionStatus === Constants.CONNECTION_STATUS.CONNECTED,
  )

  const disconnectedPlayers = players.filter(
    (player) =>
      player.connectionStatus !== Constants.CONNECTION_STATUS.CONNECTED,
  )

  const sortedPlayers = [
    ...sortPlayers(connectedPlayers, winningScore),
    ...sortPlayers(disconnectedPlayers, winningScore),
  ]

  // Calculate ranks (only after first round)
  const ranks: Record<string, number | string> = {}
  if (nbRounds === 0) {
    // First round: show "-" instead of ranks
    sortedPlayers.forEach((player) => {
      ranks[player.id] = "-"
    })
  } else {
    // After first round: calculate actual ranks
    let rank = 1
    for (let i = 0; i < sortedPlayers.length; i++) {
      if (i > 0 && sortedPlayers[i].score > sortedPlayers[i - 1].score) {
        rank = i + 1
      }
      ranks[sortedPlayers[i].id] = rank
    }
  }

  return ranks
}
