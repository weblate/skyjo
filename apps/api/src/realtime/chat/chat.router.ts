import { consumeSocketRateLimiter } from "@/realtime/utils/rateLimiter.js"
import { socketErrorWrapper } from "@/realtime/utils/socketErrorWrapper.js"
import {
  type SendChatMessage,
  type WizzPlayerUsername,
  sendChatMessage,
  wizzPlayerUsername,
} from "@skymo/shared/validations"
import { RateLimiterMemory } from "rate-limiter-flexible"
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
    socketErrorWrapper(async (data: WizzPlayerUsername) => {
      await consumeSocketRateLimiter(rateLimiterWizz)(socket)

      const targetUsername = wizzPlayerUsername.parse(data)

      await instance.onWizz(socket, targetUsername)
    }),
  )
}

export { chatRouter }
