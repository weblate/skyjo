import { randomUUID } from "node:crypto"
import {
  Constants as CoreConstants,
  type Game,
  type GameRedisDb,
  type Player,
  type PlayerRedisDb,
} from "@skymo/core"
import { userTable } from "@skymo/database/schema"
import { eq } from "drizzle-orm"
import { db } from "@/db/index.js"
import { posthog } from "@/services/posthog.service.js"

type AnalyticsPlayer = Player | PlayerRedisDb | null | undefined
/**
 * Get distinct ID for a player (user, guest, or anonymous)
 */
async function getPlayerDistinctId(player: AnalyticsPlayer) {
  const analyticsConsent = await getPlayerAnalyticsConsent(player)

  let distinctId: string
  if (analyticsConsent === false) {
    // User opted out - use random anonymous ID (not linkable to user)
    // This allows game statistics while respecting user privacy
    const timestamp = Date.now()
    const random = randomUUID()
    distinctId = `anonymous_${timestamp}_${random}`
  } else if (player?.userId) {
    // Authenticated user with consent
    distinctId = `user_${player.userId}`
  } else if (player?.guestId) {
    // Guest player
    distinctId = `guest_${player.guestId}`
  } else {
    // Fallback for truly anonymous events
    distinctId = "anonymous"
  }

  return distinctId
}

/**
 * Get analytics consent for a player
 * - Authenticated users: fetch from database
 * - Guests/anonymous: return undefined (will use regular capture)
 */
async function getPlayerAnalyticsConsent(
  player: AnalyticsPlayer,
): Promise<boolean | undefined> {
  if (!player?.userId) {
    // Guests and anonymous players - no consent check needed
    return undefined
  }

  // Fetch consent from database for authenticated users
  const [user] = await db
    .select({ analyticsConsent: userTable.analyticsConsent })
    .from(userTable)
    .where(eq(userTable.id, player.userId))
    .limit(1)

  return user?.analyticsConsent
}

function getWinnerType(
  player: AnalyticsPlayer,
): "authenticated" | "guest" | "unknown" {
  if (player?.userId) {
    return "authenticated"
  } else if (player?.guestId) {
    return "guest"
  }

  return "unknown"
}

/**
 * Capture analytics event with consent check for authenticated users
 * - Opted-in authenticated users: tracked with user_${userId}
 * - Opted-out authenticated users: tracked with random anonymous ID (not linkable)
 * - Guests: tracked with guest_${guestId}
 */
async function captureGameEvent({
  player,
  event,
  properties = {},
}: {
  player: AnalyticsPlayer
  event: string
  properties?: Record<string, unknown>
}) {
  const distinctId = await getPlayerDistinctId(player)

  posthog.capture({ distinctId, event, properties })
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
export async function trackAnalyticsGameCreated(
  game: Game,
  creatorPlayer: Player,
) {
  await captureGameEvent({
    player: creatorPlayer,
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
export async function trackAnalyticsGameJoined(
  game: Game,
  player: Player,
  isReconnect = false,
) {
  const playerCounts = getPlayerCounts(game)

  await captureGameEvent({
    player,
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
export async function trackAnalyticsGameStarted(game: Game) {
  const host = game.getPlayerById(game.hostId)

  await captureGameEvent({
    player: host,
    event: "Game: Started",
    properties: getGameProperties(game),
  })
}

/**
 * Track when a round starts
 */
export async function trackAnalyticsRoundStarted(game: Game) {
  const host = game.getPlayerById(game.hostId)

  await captureGameEvent({
    player: host,
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
export async function trackAnalyticsRoundEnded(
  game: Game,
  roundWinner: Player | null | undefined,
) {
  const host = game.getPlayerById(game.hostId)
  const roundDuration = game.getRoundDuration()

  await captureGameEvent({
    player: host,
    event: "Game: Round Ended",
    properties: {
      ...getGameProperties(game),
      round_number: game.roundNumber,
      round_duration_ms: roundDuration,
      winner_type: getWinnerType(roundWinner),
    },
  })
}

/**
 * Track when a game ends (for GameRedisDb)
 */
export async function trackAnalyticsGameEndedFromRedis(
  game: GameRedisDb,
  gameWinner: PlayerRedisDb | null | undefined,
) {
  const host = game.players.find((p) => p.id === game.hostId)

  const gameDuration = game.gameStartedAt
    ? Date.now() - new Date(game.gameStartedAt).getTime()
    : 0

  const connectedPlayers = game.players.filter(
    (p) => p.connectionStatus === CoreConstants.CONNECTION_STATUS.CONNECTED,
  )
  const authenticatedPlayers = connectedPlayers.filter((p) => p.userId).length
  const guestPlayers = connectedPlayers.length - authenticatedPlayers

  await captureGameEvent({
    player: host,
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
      winner_type: getWinnerType(gameWinner),
    },
  })
}

/**
 * Track when a player leaves a game
 */
export async function trackAnalyticsPlayerLeft(
  game: Game,
  player: Player,
  reason: "disconnect" | "kick" | "voluntary",
) {
  const playerCounts = getPlayerCounts(game)

  await captureGameEvent({
    player,
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
export async function trackAnalyticsGameAbandoned(
  game: Game,
  remainingPlayerCount: number,
  reason: "all_players_left" | "host_left" | "insufficient_players",
) {
  const host = game.getPlayerById(game.hostId)
  const gameDuration = game.getGameDuration()

  await captureGameEvent({
    player: host,
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
export async function trackAnalyticsChatMessage(
  game: Game,
  player: Player,
  messageLength: number,
) {
  await captureGameEvent({
    player,
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
export async function trackAnalyticsPlayerReported(
  reporter: Player,
  reportedPlayer: Player,
  reason: string,
) {
  await captureGameEvent({
    player: reporter,
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
export async function trackAnalyticsKickVoteInitiated(
  game: Game,
  initiator: Player,
  target: Player,
) {
  await captureGameEvent({
    player: initiator,
    event: "Game: Kick Vote Initiated",
    properties: {
      game_code: game.code,
      target_player_type: target.userId ? "authenticated" : "guest",
    },
  })
}
