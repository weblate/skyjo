import { cn } from "@/lib/utils"
import { Opponents } from "@/types/opponents"
import {
  Constants as CoreConstants,
  GameStatus,
  GameToJson,
  LastTurnStatus,
  PlayerToJson,
  RoundPhase,
  TurnStatus,
} from "@skymo/core"
import { ClassValue } from "clsx"

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
  if (isRoundRevealCards(game.roundPhase) && isGamePlaying(game.status)) {
    return !hasRevealedCardCount(player, game.settings.initialTurnedCount)
  }

  if (!isGamePlaying(game.status) || isRoundOver(game.roundPhase)) {
    return false
  }

  return game.players[game.turn]?.id === player.id
}

export const hasRevealedCardCount = (player: PlayerToJson, count: number) => {
  const currentCount = player.cards
    .flat()
    .filter((card) => card.isVisible).length

  return currentCount === count
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

//#region round phases
export const isRoundRevealCards = (roundPhase?: RoundPhase) => {
  return roundPhase === CoreConstants.ROUND_PHASE.REVEAL_CARDS
}

export const isRoundMain = (roundPhase?: RoundPhase) => {
  return roundPhase === CoreConstants.ROUND_PHASE.MAIN
}

export const isRoundLastLap = (roundPhase?: RoundPhase) => {
  return roundPhase === CoreConstants.ROUND_PHASE.LAST_LAP
}

export const isRoundOver = (roundPhase?: RoundPhase) => {
  return roundPhase === CoreConstants.ROUND_PHASE.OVER
}
//#endregion

//#region game status
export const isGameLobby = (status?: GameStatus) => {
  return status === CoreConstants.GAME_STATUS.LOBBY
}

export const isGamePlaying = (status?: GameStatus) => {
  return status === CoreConstants.GAME_STATUS.PLAYING
}

export const isGameFinished = (status?: GameStatus) => {
  return status === CoreConstants.GAME_STATUS.FINISHED
}

export const isGameStopped = (status?: GameStatus) => {
  return status === CoreConstants.GAME_STATUS.STOPPED
}
//#endregion

//#region turn status
export const isTurnChooseAPile = (turnStatus?: TurnStatus) => {
  return turnStatus === CoreConstants.TURN_STATUS.CHOOSE_A_PILE
}

export const isTurnThrowOrReplace = (turnStatus?: TurnStatus) => {
  return turnStatus === CoreConstants.TURN_STATUS.THROW_OR_REPLACE
}

export const isTurnTurnACard = (turnStatus?: TurnStatus) => {
  return turnStatus === CoreConstants.TURN_STATUS.TURN_A_CARD
}

export const isTurnReplaceACard = (turnStatus?: TurnStatus) => {
  return turnStatus === CoreConstants.TURN_STATUS.REPLACE_A_CARD
}
//#endregion

//#region last turn status
export const isLastTurnPickFromDrawPile = (lastTurnStatus?: LastTurnStatus) => {
  return lastTurnStatus === CoreConstants.LAST_TURN_STATUS.PICK_FROM_DRAW_PILE
}

export const isLastTurnPickFromDiscardPile = (
  lastTurnStatus?: LastTurnStatus,
) => {
  return (
    lastTurnStatus === CoreConstants.LAST_TURN_STATUS.PICK_FROM_DISCARD_PILE
  )
}

export const isLastTurnThrow = (lastTurnStatus?: LastTurnStatus) => {
  return lastTurnStatus === CoreConstants.LAST_TURN_STATUS.THROW
}

export const isLastTurnReplace = (lastTurnStatus?: LastTurnStatus) => {
  return lastTurnStatus === CoreConstants.LAST_TURN_STATUS.REPLACE
}

export const isLastTurnTurn = (lastTurnStatus?: LastTurnStatus) => {
  return lastTurnStatus === CoreConstants.LAST_TURN_STATUS.TURN
}
//#endregion

export const getBoardScaleClass = (
  isPlayerTurn: boolean,
  enlargeActivePlayerBoard: boolean,
  isOpponent: boolean = false,
) => {
  if (!enlargeActivePlayerBoard || isPlayerTurn) return "scale-100"

  let className: ClassValue = "scale-90"
  if (isOpponent) className = cn(className, "-translate-y-2")
  else className = cn(className, "translate-y-2")

  return className
}
