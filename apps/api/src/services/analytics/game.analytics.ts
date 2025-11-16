import {
  Constants as CoreConstants,
  type Game,
  type GameRedisDb,
  type Player,
  type PlayerRedisDb,
} from "@skymo/core"
import { posthog } from "@/services/posthog.service.js"

/**
 * Get distinct ID for a player (user, guest, or anonymous)
 */
function getPlayerDistinctId(player: Player | null | undefined): string {
  if (!player) return "anonymous"
  if (player.userId) return `user_${player.userId}`
  if (player.guestId) return `guest_${player.guestId}`
  return "anonymous"
}

/**
 * Get player count breakdown
 */
function getPlayerCounts(game: Game) {
  const connectedPlayers = game.getConnectedPlayers()
  const authenticatedPlayers = connectedPlayers.filter((p) => p.userId).length
  const guestPlayers = connectedPlayers.length - authenticatedPlayers

  return {
    total: connectedPlayers.length,
    authenticated: authenticatedPlayers,
    guests: guestPlayers,
  }
}

/**
 * Get common game properties for analytics
 */
function getGameProperties(game: Game) {
  const playerCounts = getPlayerCounts(game)

  return {
    game_code: game.code,
    player_count: playerCounts.total,
    authenticated_players: playerCounts.authenticated,
    guest_players: playerCounts.guests,
    is_private: game.settings.private,
    max_players: game.settings.maxPlayers,
  }
}

/**
 * Track when a game is created
 */
export function trackAnalyticsGameCreated(
  game: Game,
  creatorPlayer: Player | null | undefined,
) {
  const distinctId = getPlayerDistinctId(creatorPlayer)

  posthog.capture({
    distinctId,
    event: "Game: Created",
    properties: {
      game_code: game.code,
      is_private: game.settings.private,
      max_players: game.settings.maxPlayers,
    },
  })
}

/**
 * Track when a player joins a game
 */
export function trackAnalyticsGameJoined(
  game: Game,
  player: Player,
  isReconnect = false,
) {
  const distinctId = getPlayerDistinctId(player)
  const playerCounts = getPlayerCounts(game)

  posthog.capture({
    distinctId,
    event: isReconnect ? "Game: Rejoined" : "Game: Joined",
    properties: {
      game_code: game.code,
      player_count: playerCounts.total,
      is_private: game.settings.private,
    },
  })
}

/**
 * Track when a game starts
 */
export function trackAnalyticsGameStarted(game: Game) {
  const host = game.getPlayerById(game.hostId)
  const distinctId = getPlayerDistinctId(host)

  posthog.capture({
    distinctId,
    event: "Game: Started",
    properties: getGameProperties(game),
  })
}

/**
 * Track when a round starts
 */
export function trackAnalyticsRoundStarted(game: Game) {
  const host = game.getPlayerById(game.hostId)
  const distinctId = getPlayerDistinctId(host)

  posthog.capture({
    distinctId,
    event: "Game: Round Started",
    properties: {
      ...getGameProperties(game),
      round_number: game.roundNumber,
    },
  })
}

/**
 * Track when a round ends
 */
export function trackAnalyticsRoundEnded(
  game: Game,
  roundWinner: Player | null | undefined,
) {
  const host = game.getPlayerById(game.hostId)
  const distinctId = getPlayerDistinctId(host)
  const roundDuration = game.getRoundDuration()

  posthog.capture({
    distinctId,
    event: "Game: Round Ended",
    properties: {
      ...getGameProperties(game),
      round_number: game.roundNumber,
      round_duration_ms: roundDuration,
      winner_type: roundWinner?.userId
        ? "authenticated"
        : roundWinner?.guestId
          ? "guest"
          : "unknown",
    },
  })
}

/**
 * Track when a game ends (for GameRedisDb)
 */
export function trackAnalyticsGameEndedFromRedis(
  game: GameRedisDb,
  gameWinner: PlayerRedisDb | null | undefined,
) {
  const host = game.players.find((p) => p.id === game.hostId)
  const distinctId = getPlayerDistinctId(host as Player | null | undefined)

  const gameDuration = game.gameStartedAt
    ? Date.now() - new Date(game.gameStartedAt).getTime()
    : 0

  const connectedPlayers = game.players.filter(
    (p) => p.connectionStatus === CoreConstants.CONNECTION_STATUS.CONNECTED,
  )
  const authenticatedPlayers = connectedPlayers.filter((p) => p.userId).length
  const guestPlayers = connectedPlayers.length - authenticatedPlayers

  posthog.capture({
    distinctId,
    event: "Game: Ended",
    properties: {
      game_code: game.code,
      player_count: connectedPlayers.length,
      authenticated_players: authenticatedPlayers,
      guest_players: guestPlayers,
      is_private: game.settings.private,
      max_players: game.settings.maxPlayers,
      total_rounds: game.roundNumber,
      game_duration_ms: gameDuration,
      winner_type: gameWinner?.userId
        ? "authenticated"
        : gameWinner?.guestId
          ? "guest"
          : "unknown",
    },
  })
}

/**
 * Track when a player leaves a game
 */
export function trackAnalyticsPlayerLeft(
  game: Game,
  player: Player,
  reason: "disconnect" | "kick" | "voluntary",
) {
  const distinctId = getPlayerDistinctId(player)
  const playerCounts = getPlayerCounts(game)

  posthog.capture({
    distinctId,
    event: "Game: Player Left",
    properties: {
      game_code: game.code,
      reason,
      player_count: playerCounts.total,
      game_in_progress: game.roundNumber > 0,
      round_number: game.roundNumber,
    },
  })
}

/**
 * Track game abandonment - game ended with players leaving mid-game
 */
export function trackAnalyticsGameAbandoned(
  game: Game,
  remainingPlayerCount: number,
  reason: "all_players_left" | "host_left" | "insufficient_players",
) {
  const host = game.getPlayerById(game.hostId)
  const distinctId = getPlayerDistinctId(host)
  const gameDuration = game.getGameDuration()

  posthog.capture({
    distinctId,
    event: "Game: Abandoned",
    properties: {
      game_code: game.code,
      reason,
      round_number: game.roundNumber,
      remaining_players: remainingPlayerCount,
      game_duration_ms: gameDuration,
    },
  })
}

/**
 * Track when a chat message is sent
 */
export function trackAnalyticsChatMessage(
  game: Game,
  player: Player,
  messageLength: number,
) {
  const distinctId = getPlayerDistinctId(player)

  posthog.capture({
    distinctId,
    event: "Chat: Message Sent",
    properties: {
      game_code: game.code,
      message_length: messageLength,
      player_type: player.userId ? "authenticated" : "guest",
    },
  })
}

/**
 * Track when a player is reported
 */
export function trackAnalyticsPlayerReported(
  reporter: Player,
  reportedPlayer: Player,
  reason: string,
) {
  const distinctId = getPlayerDistinctId(reporter)

  posthog.capture({
    distinctId,
    event: "Player: Reported",
    properties: {
      reported_player_type: reportedPlayer.userId ? "authenticated" : "guest",
      report_reason: reason,
    },
  })
}

/**
 * Track when a kick vote is initiated
 */
export function trackAnalyticsKickVoteInitiated(
  game: Game,
  initiator: Player,
  target: Player,
) {
  const distinctId = getPlayerDistinctId(initiator)

  posthog.capture({
    distinctId,
    event: "Game: Kick Vote Initiated",
    properties: {
      game_code: game.code,
      target_player_type: target.userId ? "authenticated" : "guest",
    },
  })
}
