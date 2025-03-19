import { Opponents } from "@/types/opponents"
import {
  Constants as CoreConstants,
  GameToJson,
  PlayerToJson,
} from "@skymo/core"

export const getCurrentUser = (
  players: GameToJson["players"] | undefined,
  playerId: string,
) => {
  if (!players) {
    return undefined
  }

  return players.find((player) => player.id === playerId)
}

export const getConnectedPlayers = (
  players: GameToJson["players"] | undefined,
) => {
  if (!players) {
    return []
  }

  return players.filter(
    (player) =>
      player.connectionStatus !== CoreConstants.CONNECTION_STATUS.DISCONNECTED,
  )
}

export const getOpponents = (
  players: GameToJson["players"] | undefined,
  playerId: string,
): Opponents => {
  if (!players) {
    return [[], [], []]
  }

  const connectedPlayers = getConnectedPlayers(players)

  const playerIndex = connectedPlayers.findIndex(
    (player) => player.id === playerId,
  )

  const connectedOpponents = [
    ...connectedPlayers.slice(playerIndex + 1),
    ...connectedPlayers.slice(0, playerIndex),
  ]

  // if 2 players then [[], [player, player], []]
  // if 3 players then [[player], [player], [player]]
  // if 4 players then [[player], [player, player], [player]]
  // if 5 players then [[player], [player, player, player], [player]]
  // if 6 players then [[player], [player, player, player, player], [player]]
  // if 7 players then [[player], [player, player, player, player, player], [player]]

  if (connectedOpponents.length <= 2) {
    return [[], connectedOpponents, []]
  } else {
    const firstOpponent = connectedOpponents.shift()!
    const lastOpponent = connectedOpponents.pop()!

    return [[firstOpponent], connectedOpponents, [lastOpponent]]
  }
}

export const isCurrentUserTurn = (game?: GameToJson, player?: PlayerToJson) => {
  if (!player || !game) return false
  if (
    game.roundPhase === CoreConstants.ROUND_PHASE.REVEAL_CARDS &&
    game.status === CoreConstants.GAME_STATUS.PLAYING
  )
    return true

  if (
    game.status !== CoreConstants.GAME_STATUS.PLAYING ||
    game.roundPhase === CoreConstants.ROUND_PHASE.OVER
  )
    return false

  return game.players[game.turn].id === player.id
}

export const hasRevealedCardCount = (player: PlayerToJson, count: number) => {
  const currentCount = player.cards
    .flat()
    .filter((card) => card.isVisible).length

  return currentCount === count
}

export const canTurnInitialCard = (game: GameToJson) => {
  return (
    game.status === CoreConstants.GAME_STATUS.PLAYING &&
    game.roundPhase === CoreConstants.ROUND_PHASE.REVEAL_CARDS
  )
}

export const hasTurnedCard = (player: PlayerToJson, count: number) => {
  const visibleCards = player.cards.flat().filter((card) => card.isVisible)

  return visibleCards.length === count
}

export const getCurrentWhoHasToPlay = (game: GameToJson) => {
  const players = getConnectedPlayers(game.players)

  return players.find((player) => player.id === game.players[game.turn].id)
}

export const getNextPlayerIndex = (
  game: GameToJson,
  currentPlayer: PlayerToJson,
): number => {
  const opponents = getOpponents(game.players, currentPlayer.id).flat()

  if (opponents.length === 0) {
    return -1
  }

  const currentTurnIndex = game.players.findIndex(
    (p) => p.id === game.players[game.turn].id,
  )

  let nextOpponentIndex = opponents.findIndex(
    (opponent) =>
      game.players.findIndex((p) => p.id === opponent.id) > currentTurnIndex,
  )

  if (nextOpponentIndex === -1) {
    nextOpponentIndex = 0
  }

  return nextOpponentIndex
}

export const isHost = (game?: GameToJson, playerId?: string) => {
  if (!game || !playerId) return false

  return playerId === game.hostId
}

export const getHost = (game?: GameToJson) => {
  if (!game) return undefined
  return game.players.find((player) => player.id === game.hostId)
}

export const getCurrentScore = (player: PlayerToJson) => {
  return player.cards
    .flat()
    .reduce((acc, card) => (card.isVisible ? acc + card.value! : acc), 0)
}
