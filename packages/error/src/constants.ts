export class Constants {
  static readonly ERROR = {
    GAME_NOT_FOUND: "game-not-found",
    GAME_ALREADY_EXISTS: "game-already-exists",
    PLAYER_NOT_FOUND: "player-not-found",
    PLAYER_BANNED: "player-banned",
    PLAYER_NOT_CONNECTED: "player-not-connected",
    NOT_ALLOWED: "not-allowed",
    INVALID_TURN_STATE: "invalid-turn-state",
    TOO_FEW_PLAYERS: "too-few-players",
    CANNOT_RECONNECT: "cannot-reconnect",
    GAME_IS_FULL: "game-is-full",
    GAME_ALREADY_STARTED: "game-already-started",
    KICK_VOTE_IN_PROGRESS: "kick-vote-in-progress",
    NO_KICK_VOTE_IN_PROGRESS: "no-kick-vote-in-progress",
    PLAYER_ALREADY_VOTED: "player-already-voted",
    UNKNOWN_OPERATION: "unknown-operation",
    STATE_VERSION_AHEAD: "state-version-ahead",
    STATE_VERSION_BEHIND: "state-version-behind",
    STATE_VERSION_NULL: "state-version-null",
    TOO_MANY_REQUESTS: "too-many-requests",
    GAME_ALREADY_PROCESSING_AFK: "game-already-processing-afk",
    PLAYER_ALREADY_CONNECTED: "player-already-connected",
    MAX_PLAYERS_TOO_LOW: "max-players-too-low",
    UNEXPECTED_ERROR: "unexpected-error",
    MESSAGE_NOT_FOUND: "message-not-found",
    UNAUTHORIZED: "unauthorized",
  } as const

  static readonly BAN_ERROR = {
    NOT_ALLOWED: "not-allowed",
    PLAYER_NOT_FOUND: "player-not-found",
    PLAYER_BANNED: "player-banned",
    UNEXPECTED_ERROR: "unexpected-error",
  } as const
}
export type Error = (typeof Constants.ERROR)[keyof typeof Constants.ERROR]

export type BanError =
  (typeof Constants.BAN_ERROR)[keyof typeof Constants.BAN_ERROR]
