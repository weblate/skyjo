import {
  type CreatePlayer,
  createPlayer,
  type JoinGame,
  joinGame,
} from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type {
  ErrorCreateMessage,
  ErrorJoinMessage,
  ErrorUpdateMaxPlayersMessage,
} from "@skymo/shared/types"
import {
  type UpdateGameSettings,
  type UpdateMaxPlayers,
  updateGameSettingsSchema,
  updateMaxPlayersSchema,
} from "@skymo/shared/validations"
import { RateLimiterMemory } from "rate-limiter-flexible"
import { getActivePenalties } from "@/http/penalty/penalty.service.js"
import { validateSocketData } from "@/realtime/middleware/socketDataValidation.js"
import { consumeSocketRateLimiter } from "@/realtime/utils/rateLimiter.js"
import { socketErrorWrapper } from "@/realtime/utils/socketErrorWrapper.js"
import type { GameSocket } from "../types/gameSocket.js"
import { LobbyService } from "./lobby.service.js"

const instance = new LobbyService()

const settingsRateLimiter = new RateLimiterMemory({
  keyPrefix: "settings",
  points: 10,
  duration: 5,
})

const startCountdownRateLimiter = new RateLimiterMemory({
  keyPrefix: "start-countdown",
  points: 5,
  duration: 10,
})

const cancelCountdownRateLimiter = new RateLimiterMemory({
  keyPrefix: "cancel-countdown",
  points: 8,
  duration: 10,
})

async function hasActiveBan(
  userId?: number,
  guestId?: string,
): Promise<{ isBanned: boolean; isPenaltyBan: boolean }> {
  const penalties = await getActivePenalties(userId, guestId)
  const banPenalties = penalties.filter(
    (p) => p.type === "tempban" || p.type === "ban",
  )

  if (banPenalties.length === 0) {
    return { isBanned: false, isPenaltyBan: false }
  }

  // Consider it a penalty ban if there's at least one ban/tempban penalty
  // In the future, we could add more logic here to differentiate manual vs automated bans
  return { isBanned: true, isPenaltyBan: true }
}

const lobbyRouter = (socket: GameSocket) => {
  socket.on(
    "create",
    socketErrorWrapper(async (player: CreatePlayer, isPrivate: boolean) => {
      try {
        const parsedPlayer = createPlayer.parse(player)

        // Check if the player is banned
        const banStatus = await hasActiveBan(socket.user?.id, socket.guestId)
        if (banStatus.isBanned) {
          const errorCode = banStatus.isPenaltyBan
            ? ErrorConstants.ERROR.PLAYER_PENALTY_BANNED
            : ErrorConstants.ERROR.PLAYER_BANNED

          throw new CError("Player tried to create a game but is banned.", {
            code: errorCode,
            level: "warn",
            meta: {
              socketId: socket.id,
              userId: socket.user?.id,
              guestId: socket.guestId,
              playerName: parsedPlayer.name,
              isPenaltyBan: banStatus.isPenaltyBan,
            },
          })
        }

        await instance.onCreate(socket, parsedPlayer, isPrivate)
      } catch (error) {
        if (
          error instanceof CError &&
          (error.code === ErrorConstants.ERROR.PLAYER_BANNED ||
            error.code === ErrorConstants.ERROR.PLAYER_PENALTY_BANNED)
        ) {
          socket.emit("error:create", error.code satisfies ErrorCreateMessage)
        } else {
          throw error
        }
      }
    }),
  )

  socket.on(
    "join",
    socketErrorWrapper(async (data: JoinGame) => {
      try {
        const { gameCode, player } = joinGame.parse(data)

        // Check if the player is banned
        const banStatus = await hasActiveBan(socket.user?.id, socket.guestId)
        if (banStatus.isBanned) {
          const errorCode = banStatus.isPenaltyBan
            ? ErrorConstants.ERROR.PLAYER_PENALTY_BANNED
            : ErrorConstants.ERROR.PLAYER_BANNED

          throw new CError("Player tried to join a game but is banned.", {
            code: errorCode,
            level: "warn",
            meta: {
              socketId: socket.id,
              userId: socket.user?.id,
              guestId: socket.guestId,
              playerName: player.name,
              gameCode,
              isPenaltyBan: banStatus.isPenaltyBan,
            },
          })
        }

        await instance.onJoin(socket, gameCode, player)
      } catch (error) {
        if (
          error instanceof CError &&
          (error.code === ErrorConstants.ERROR.GAME_NOT_FOUND ||
            error.code === ErrorConstants.ERROR.GAME_ALREADY_STARTED ||
            error.code === ErrorConstants.ERROR.GAME_IS_FULL ||
            error.code === ErrorConstants.ERROR.PLAYER_BANNED ||
            error.code === ErrorConstants.ERROR.PLAYER_PENALTY_BANNED ||
            error.code === ErrorConstants.ERROR.PLAYER_ALREADY_CONNECTED)
        ) {
          socket.emit("error:join", error.code satisfies ErrorJoinMessage)
        } else {
          throw error
        }
      }
    }),
  )

  //#region update settings
  socket.on(
    "game:reset-settings",
    socketErrorWrapper(async () => {
      validateSocketData(socket)
      await consumeSocketRateLimiter(settingsRateLimiter)(socket)

      await instance.onResetSettings(socket)
    }),
  )
  socket.on(
    "game:update-max-players",
    socketErrorWrapper(async (data: UpdateMaxPlayers) => {
      validateSocketData(socket)
      try {
        await consumeSocketRateLimiter(settingsRateLimiter)(socket)

        const maxPlayers = updateMaxPlayersSchema.parse(data)
        await instance.onUpdateMaxPlayers(socket, maxPlayers)
      } catch (error) {
        if (
          error instanceof CError &&
          (error.code === ErrorConstants.ERROR.MAX_PLAYERS_TOO_LOW ||
            error.code === ErrorConstants.ERROR.NOT_ALLOWED)
        ) {
          socket.emit(
            "error:update-max-players",
            error.code satisfies ErrorUpdateMaxPlayersMessage,
          )
        } else {
          throw error
        }
      }
    }),
  )
  socket.on(
    "game:update-settings",
    socketErrorWrapper(async (data: UpdateGameSettings) => {
      validateSocketData(socket)
      await consumeSocketRateLimiter(settingsRateLimiter)(socket)

      const settings = updateGameSettingsSchema.parse(data)
      await instance.onUpdateSettings(socket, settings)
    }),
  )
  socket.on(
    "game:settings:toggle-validation",
    socketErrorWrapper(async () => {
      validateSocketData(socket)
      await instance.onToggleSettingsValidation(socket)
    }),
  )
  //#endregion

  socket.on(
    "game:start-countdown",
    socketErrorWrapper(async () => {
      validateSocketData(socket)
      await consumeSocketRateLimiter(startCountdownRateLimiter)(socket)

      await instance.onStartCountdown(socket)
    }),
  )

  socket.on(
    "game:cancel-countdown",
    socketErrorWrapper(async () => {
      validateSocketData(socket)
      await consumeSocketRateLimiter(cancelCountdownRateLimiter)(socket)

      await instance.onCancelCountdown(socket)
    }),
  )
}

export { lobbyRouter }
