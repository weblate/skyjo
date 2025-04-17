import { LobbyService } from "@/socketio/services/lobby.service.js"
import { consumeSocketRateLimiter } from "@/socketio/utils/rateLimiter.js"
import { socketErrorWrapper } from "@/socketio/utils/socketErrorWrapper.js"
import {
  type CreatePlayer,
  type JoinGame,
  createPlayer,
  joinGame,
} from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { ErrorJoinMessage } from "@skymo/shared/types"
import {
  type UpdateGameSettings,
  type UpdateMaxPlayers,
  updateGameSettingsSchema,
  updateMaxPlayersSchema,
} from "@skymo/shared/validations"
import { RateLimiterMemory } from "rate-limiter-flexible"
import type { GameSocket } from "../types/gameSocket.js"

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

const lobbyRouter = (socket: GameSocket) => {
  socket.on(
    "create",
    socketErrorWrapper(async (player: CreatePlayer, isPrivate: boolean) => {
      const parsedPlayer = createPlayer.parse(player)
      await instance.onCreate(socket, parsedPlayer, isPrivate)
    }),
  )

  socket.on(
    "join",
    socketErrorWrapper(async (data: JoinGame) => {
      try {
        const { gameCode, player } = joinGame.parse(data)
        await instance.onJoin(socket, gameCode, player)
      } catch (error) {
        if (
          error instanceof CError &&
          (error.code === ErrorConstants.ERROR.GAME_NOT_FOUND ||
            error.code === ErrorConstants.ERROR.GAME_ALREADY_STARTED ||
            error.code === ErrorConstants.ERROR.GAME_IS_FULL ||
            error.code === ErrorConstants.ERROR.PLAYER_BANNED)
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
      await consumeSocketRateLimiter(settingsRateLimiter)(socket)

      const maxPlayers = updateMaxPlayersSchema.parse(data)
      await instance.onUpdateMaxPlayers(socket, maxPlayers)
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
