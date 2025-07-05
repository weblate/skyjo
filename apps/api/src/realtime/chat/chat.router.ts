import {
  type SendChatMessage,
  sendChatMessage,
  type WizzPlayerName,
  wizzPlayerName,
} from "@skymo/shared/validations"
import { RateLimiterMemory } from "rate-limiter-flexible"
import { consumeSocketRateLimiter } from "@/realtime/utils/rateLimiter.js"
import { socketErrorWrapper } from "@/realtime/utils/socketErrorWrapper.js"
import type { GameSocket } from "../types/gameSocket.js"
import { ChatService } from "./chat.service.js"

const instance = new ChatService()

const rateLimiter = new RateLimiterMemory({
  keyPrefix: "chat",
  points: 10,
  duration: 5,
  blockDuration: 20,
})

const rateLimiterWizz = new RateLimiterMemory({
  keyPrefix: "chat-wizz",
  points: 1,
  duration: 5,
  blockDuration: 20,
})

const chatRouter = (socket: GameSocket) => {
  socket.on(
    "message",
    socketErrorWrapper(async (data: SendChatMessage) => {
      await consumeSocketRateLimiter(rateLimiter)(socket)

      const message = sendChatMessage.parse(data)
      await instance.onMessage(socket, message)
    }),
  )

  socket.on(
    "wizz",
    socketErrorWrapper(async (data: WizzPlayerName) => {
      await consumeSocketRateLimiter(rateLimiterWizz)(socket)

      const targetName = wizzPlayerName.parse(data)

      await instance.onWizz(socket, targetName)
    }),
  )
}

export { chatRouter }
