import { ReportService } from "@/socketio/services/report.service.js"
import { consumeSocketRateLimiter } from "@/socketio/utils/rateLimiter.js"
import { socketErrorWrapper } from "@/socketio/utils/socketErrorWrapper.js"
import { type Report } from "@skymo/shared/validations"
import { RateLimiterMemory } from "rate-limiter-flexible"
import type { GameSocket } from "../types/gameSocket.js"

const instance = new ReportService()

const rateLimiterReport = new RateLimiterMemory({
  keyPrefix: "report",
  points: 10,
  duration: 300,
  blockDuration: 600,
})

const reportRouter = (socket: GameSocket) => {
  socket.on(
    "report",
    socketErrorWrapper(async (data: Report) => {
      await consumeSocketRateLimiter(rateLimiterReport)(socket)

      await instance.onReport(socket, data)
    }),
  )
}

export { reportRouter }
