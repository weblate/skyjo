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
): Promise<boolean> {
  const penalties = await getActivePenalties(userId, guestId)
  return penalties.some((p) => p.type === "tempban" || p.type === "ban")
}

const lobbyRouter = (socket: GameSocket) => {
  socket.on(
    "create",
    socketErrorWrapper(async (player: CreatePlayer, isPrivate: boolean) => {
      try {
        const parsedPlayer = createPlayer.parse(player)

        // Check if the player is banned
        const isBanned = await hasActiveBan(socket.user?.id, socket.guestId)
        if (isBanned) {
          throw new CError("Player tried to create a game but is banned.", {
            code: ErrorConstants.ERROR.PLAYER_BANNED,
            level: "warn",
            meta: {
              socketId: socket.id,
              userId: socket.user?.id,
              guestId: socket.guestId,
              playerName: parsedPlayer.name,
            },
          })
        }

        await instance.onCreate(socket, parsedPlayer, isPrivate)
      } catch (error) {
        if (
          error instanceof CError &&
          error.code === ErrorConstants.ERROR.PLAYER_BANNED
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
        const isBanned = await hasActiveBan(socket.user?.id, socket.guestId)
        if (isBanned) {
          throw new CError("Player tried to join a game but is banned.", {
            code: ErrorConstants.ERROR.PLAYER_BANNED,
            level: "warn",
            meta: {
              socketId: socket.id,
              userId: socket.user?.id,
              guestId: socket.guestId,
              playerName: player.name,
              gameCode,
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
      await consumeSocketRateLimiter(settingsRateLimiter)(socket)

      await instance.onResetSettings(socket)
    }),
  )
  socket.on(
    "game:update-max-players",
    socketErrorWrapper(async (data: UpdateMaxPlayers) => {
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
      await consumeSocketRateLimiter(settingsRateLimiter)(socket)

      const settings = updateGameSettingsSchema.parse(data)
      await instance.onUpdateSettings(socket, settings)
    }),
  )
  socket.on(
    "game:settings:toggle-validation",
    socketErrorWrapper(async () => {
      await instance.onToggleSettingsValidation(socket)
    }),
  )
  //#endregion

  socket.on(
    "game:start-countdown",
    socketErrorWrapper(async () => {
      await consumeSocketRateLimiter(startCountdownRateLimiter)(socket)

      await instance.onStartCountdown(socket)
    }),
  )

  socket.on(
    "game:cancel-countdown",
    socketErrorWrapper(async () => {
      await consumeSocketRateLimiter(cancelCountdownRateLimiter)(socket)

      await instance.onCancelCountdown(socket)
    }),
  )
}

export { lobbyRouter }
