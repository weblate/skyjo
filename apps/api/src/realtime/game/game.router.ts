import { consumeSocketRateLimiter } from "@/realtime/utils/rateLimiter.js"
import { socketErrorWrapper } from "@/realtime/utils/socketErrorWrapper.js"
import {
  type PlayPickCard,
  type PlayReplaceCard,
  type PlayRevealCard,
  type PlayTurnCard,
  playPickCard,
  playReplaceCard,
  playRevealCard,
  playTurnCard,
  stateVersionSchema,
} from "@skymo/core"
import { RateLimiterMemory } from "rate-limiter-flexible"
import type { GameSocket } from "../types/gameSocket.js"
import { GameService } from "./game.service.js"

const instance = new GameService()

const revealCardRateLimiter = new RateLimiterMemory({
  keyPrefix: "reveal-card",
  points: 11,
  duration: 5,
})
const gameRateLimiter = new RateLimiterMemory({
  keyPrefix: "game",
  points: 10,
  duration: 5,
})
const replayRateLimiter = new RateLimiterMemory({
  keyPrefix: "replay",
  points: 6,
  duration: 5,
})

const gameRouter = (socket: GameSocket) => {
  socket.on(
    "get",
    socketErrorWrapper(
      async (clientStateVersion: number, firstTime: boolean = false) => {
        await consumeSocketRateLimiter(gameRateLimiter)(socket)

        const stateVersion = stateVersionSchema
          .nullable()
          .parse(clientStateVersion)

        await instance.onGet(socket, stateVersion, firstTime)
      },
    ),
  )

  socket.on(
    "play:reveal-card",
    socketErrorWrapper(
      async (data: PlayRevealCard, clientStateVersion: number) => {
        await consumeSocketRateLimiter(revealCardRateLimiter)(socket)

        const turnCardData = playRevealCard.parse(data)
        const stateVersion = stateVersionSchema.parse(clientStateVersion)

        await instance.onRevealCard(socket, turnCardData, stateVersion)
      },
    ),
  )

  socket.on(
    "play:pick-card",
    socketErrorWrapper(
      async (data: PlayPickCard, clientStateVersion: number) => {
        await consumeSocketRateLimiter(gameRateLimiter)(socket)

        const playData = playPickCard.parse(data)
        const stateVersion = stateVersionSchema.parse(clientStateVersion)

        await instance.onPickCard(socket, playData, stateVersion)
      },
    ),
  )

  socket.on(
    "play:replace-card",
    socketErrorWrapper(
      async (data: PlayReplaceCard, clientStateVersion: number) => {
        await consumeSocketRateLimiter(gameRateLimiter)(socket)

        const playData = playReplaceCard.parse(data)
        const stateVersion = stateVersionSchema.parse(clientStateVersion)

        await instance.onReplaceCard(socket, playData, stateVersion)
      },
    ),
  )

  socket.on(
    "play:discard-selected-card",
    socketErrorWrapper(async (clientStateVersion: number) => {
      await consumeSocketRateLimiter(gameRateLimiter)(socket)

      const stateVersion = stateVersionSchema.parse(clientStateVersion)

      await instance.onDiscardCard(socket, stateVersion)
    }),
  )

  socket.on(
    "play:turn-card",
    socketErrorWrapper(
      async (data: PlayTurnCard, clientStateVersion: number) => {
        await consumeSocketRateLimiter(gameRateLimiter)(socket)

        const playData = playTurnCard.parse(data)
        const stateVersion = stateVersionSchema.parse(clientStateVersion)

        await instance.onTurnCard(socket, playData, stateVersion)
      },
    ),
  )

  socket.on(
    "replay",
    socketErrorWrapper(async (clientStateVersion: number) => {
      await consumeSocketRateLimiter(replayRateLimiter)(socket)

      await instance.onReplay(socket, clientStateVersion)
    }),
  )
}

export { gameRouter }
