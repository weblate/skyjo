import { Server as HttpServer } from "http"
import type { ServerType } from "@hono/node-server"
import { Logger } from "@skyjo/logger"
import { chatRouter } from "./routers/chat.router.js"
import { gameRouter } from "./routers/game.router.js"
import { kickRouter } from "./routers/kick.router.js"
import { lobbyRouter } from "./routers/lobby.router.js"
import { playerRouter } from "./routers/player.router.js"
import type { SkyjoSocket } from "./types/skyjoSocket.js"
import { SocketManager } from "./utils/SocketManager.js"
export const initializeSocketServer = (server: ServerType) => {
  const socketManager = SocketManager.getInstance()
  socketManager.setIO(server as HttpServer)
  const io = socketManager.getIO()

  io.engine.on("connection_error", (err) => {
    Logger.error("Socket connection error", err)
  })

  io.on("connection", (socket: SkyjoSocket) => {
    lobbyRouter(socket)
    playerRouter(socket)
    gameRouter(socket)
    chatRouter(socket)
    kickRouter(socket)
  })

  return io
}
