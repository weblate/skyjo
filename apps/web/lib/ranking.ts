import { Constants, type PlayerToJson } from "@skymo/core"

export type PlayerWithRank = PlayerToJson & { rank: number }

export function calculatePlayerRanks(
  players: PlayerToJson[],
): PlayerWithRank[] {
  const totalPlayers = players.length

  const connectedPlayers = players.filter(
    (player) =>
      player.connectionStatus !== Constants.CONNECTION_STATUS.DISCONNECTED,
  )
  const forfeitedPlayers = players.filter(
    (player) =>
      player.connectionStatus === Constants.CONNECTION_STATUS.DISCONNECTED &&
      player.forfeited,
  )
  const disconnectedPlayers = players.filter(
    (player) =>
      player.connectionStatus === Constants.CONNECTION_STATUS.DISCONNECTED &&
      !player.forfeited,
  )

  const sortedConnectedPlayers = [...connectedPlayers].sort(
    (a, b) => a.score - b.score,
  )

  const sortedForfeitedPlayers = [...forfeitedPlayers].sort((a, b) => {
    return (b.forfeitedAt || 0) - (a.forfeitedAt || 0)
  })

  const playersWithRanks: PlayerWithRank[] = []

  sortedConnectedPlayers.forEach((player) => {
    let rank = 1
    for (const otherPlayer of sortedConnectedPlayers) {
      if (otherPlayer.score < player.score) {
        rank++
      }
    }
    playersWithRanks.push({ ...player, rank })
  })

  const baseRankForfeited = connectedPlayers.length
  sortedForfeitedPlayers.forEach((player, index) => {
    const rank = baseRankForfeited + index + 1
    playersWithRanks.push({ ...player, rank })
  })

  disconnectedPlayers.forEach((player) => {
    playersWithRanks.push({ ...player, rank: totalPlayers })
  })

  return playersWithRanks.reverse()
}
