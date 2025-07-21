import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import {
  type TransferHost,
  transferHostSchema,
} from "@skymo/shared/validations"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import { HostTransferService } from "./hostTransfer.service.js"

export const hostTransferRouter = (socket: GameSocket) => {
  const hostTransferService = new HostTransferService()

  socket.on("host:transfer", async (data: TransferHost) => {
    try {
      const { newHostId } = transferHostSchema.parse(data)

      await hostTransferService.onTransferHost(socket, newHostId)
    } catch (error) {
      if (
        error instanceof CError &&
        (error.code === ErrorConstants.ERROR.NOT_ALLOWED ||
          error.code === ErrorConstants.ERROR.PLAYER_NOT_FOUND ||
          error.code === ErrorConstants.ERROR.PLAYER_NOT_CONNECTED)
      ) {
        Logger.error(error.message, error.meta)
        socket.emit("host:transfer-error", error.code)
      } else {
        Logger.error("Unexpected error in host:transfer", { error })
        socket.emit(
          "host:transfer-error",
          ErrorConstants.ERROR.UNEXPECTED_ERROR,
        )
      }
    }
  })
}
