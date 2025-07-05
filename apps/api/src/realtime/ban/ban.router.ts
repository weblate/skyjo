import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import { type BanPlayer, banPlayerSchema } from "@skymo/shared/validations"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import { BanService } from "./ban.service.js"

export const banRouter = (socket: GameSocket) => {
  const banService = new BanService()

  socket.on("ban:player", async (data: BanPlayer) => {
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
