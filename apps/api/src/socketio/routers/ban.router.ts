import { BanService } from "@/socketio/services/ban.service.js"
import type { SkyjoSocket } from "@/socketio/types/skyjoSocket.js"
import { CError, Constants as ErrorConstants } from "@skyjo/error"
import { Logger } from "@skyjo/logger"
import { banPlayerSchema } from "@skyjo/shared/validations"

export const banRouter = (socket: SkyjoSocket) => {
  const banService = new BanService()

  socket.on("ban:player", async (data) => {
    try {
      const { targetId } = banPlayerSchema.parse(data)

      await banService.onBanPlayer(socket, targetId)
    } catch (error) {
      if (
        error instanceof CError &&
        (error.code === ErrorConstants.BAN_ERROR.NOT_ALLOWED ||
          error.code === ErrorConstants.BAN_ERROR.PLAYER_NOT_FOUND)
      ) {
        Logger.error(error.message, error.meta)
        socket.emit("ban:error", error.code)
      } else {
        Logger.error("Unexpected error in ban:player", { error })
        socket.emit("ban:error", ErrorConstants.BAN_ERROR.UNEXPECTED_ERROR)
      }
    }
  })
}
