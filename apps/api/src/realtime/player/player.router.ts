import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import type { ErrorReconnectMessage } from "@skymo/shared/types"
import { type LastGame, reconnect } from "@skymo/shared/validations"
import type { DisconnectReason } from "socket.io"
import { socketErrorWrapper } from "@/realtime/utils/socketErrorWrapper.js"
import type { GameSocket } from "../types/gameSocket.js"
import { PlayerService } from "./player.service.js"

const instance = new PlayerService()

const playerRouter = (socket: GameSocket) => {
  if (socket.recovered) {
    socketErrorWrapper(async () => {
      await instance.onRecover(socket)
    })
  }

  socket.on(
    "leave",
    socketErrorWrapper(async () => {
      await instance.onLeave(socket)
      socket.emit("leave:success")
    }),
  )

  socket.on(
    "forfeit",
    socketErrorWrapper(async () => {
      await instance.onForfeit(socket)
      socket.emit("forfeit:success")
    }),
  )

  socket.on(
    "disconnect",
    socketErrorWrapper(async (reason: DisconnectReason) => {
      Logger.info(`Socket ${socket.id} disconnected for reason ${reason}`)

      if (reason === "ping timeout") await instance.onConnectionLost(socket)
      else await instance.onLeave(socket)
    }),
  )

  socket.on(
    "reconnect",
    socketErrorWrapper(async (reconnectData: LastGame) => {
      try {
        reconnect.parse(reconnectData)
        await instance.onReconnect(socket, reconnectData)
      } catch (error) {
        if (
          error instanceof CError &&
          error.code === ErrorConstants.ERROR.CANNOT_RECONNECT
        ) {
          socket.emit(
            "error:reconnect",
            error.code satisfies ErrorReconnectMessage,
          )
        } else {
          throw error
        }
      }
    }),
  )

  socket.on(
    "recover",
    socketErrorWrapper(async () => {
      await instance.onRecover(socket)
    }),
  )
}

export { playerRouter }
