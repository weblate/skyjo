import { Server as HttpServer } from "http"
import { reportRouter } from "@/socketio/routers/report.router.js"
import type { ServerType } from "@hono/node-server"
import { Logger } from "@skymo/logger"
import { banRouter } from "./routers/ban.router.js"
import { chatRouter } from "./routers/chat.router.js"
import { gameRouter } from "./routers/game.router.js"
import { kickRouter } from "./routers/kick.router.js"
import { lobbyRouter } from "./routers/lobby.router.js"
import { playerRouter } from "./routers/player.router.js"
import type { GameSocket } from "./types/gameSocket.js"
import { SocketManager } from "./utils/SocketManager.js"

export const initializeSocketServer = async (server: ServerType) => {
  try {
    Logger.info("Initializing Socket.IO server")
    const socketManager = SocketManager.getInstance()
    await socketManager.setIO(server as HttpServer)
    const io = socketManager.getIO()

    io.engine.on("connection_error", (error) => {
      Logger.error("Socket connection error", {
        error: error.message,
        query: error.req?._query,
        context: error.context,
        code: error.code,
      })
    })

    io.on("connection", (socket: GameSocket) => {
      Logger.debug(`New socket connection: ${socket.id}`)
      lobbyRouter(socket)
      playerRouter(socket)
      gameRouter(socket)
      chatRouter(socket)
      kickRouter(socket)
      banRouter(socket)
      reportRouter(socket)
    })

    Logger.info("Socket.IO server initialized successfully")
    return io
  } catch (error) {
    Logger.error("Failed to initialize Socket.IO server", { error })
    throw error
  }
}
