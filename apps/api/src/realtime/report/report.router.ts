import { type Report } from "@skymo/shared/validations"
import { RateLimiterMemory } from "rate-limiter-flexible"
import { validateSocketData } from "@/realtime/middleware/socketDataValidation.js"
import { consumeSocketRateLimiter } from "@/realtime/utils/rateLimiter.js"
import { socketErrorWrapper } from "@/realtime/utils/socketErrorWrapper.js"
import type { GameSocket } from "../types/gameSocket.js"
import { ReportService } from "./report.service.js"

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
      validateSocketData(socket)
      await consumeSocketRateLimiter(rateLimiterReport)(socket)

      await instance.onReport(socket, data)
    }),
  )
}

export { reportRouter }
