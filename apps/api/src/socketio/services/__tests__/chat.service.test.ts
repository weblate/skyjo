import type { GameSocket } from "@/socketio/types/gameSocket.js"
import { Constants as CoreConstants, Game, Player, Settings } from "@skymo/core"
import { Constants as ErrorConstants } from "@skymo/error"
import { mockSocket } from "@tests/_mock.js"
import { TEST_SOCKET_ID } from "@tests/constants-test.js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ChatService } from "../chat.service.js"
import "@skymo/error/test/expect-extend"

describe("ChatService", () => {
  let service: ChatService
  let socket: GameSocket

  beforeEach(() => {
    service = new ChatService()

    socket = mockSocket()
  })

  it("should be defined", () => {
    expect(ChatService).toBeDefined()
  })

  describe("onMessage", () => {
    it("should throw if player is not in the game", async () => {
      const opponent = new Player(
        { username: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      socket.data.gameCode = game.code

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(
        service.onMessage(socket, { username: "player2", message: "Hello!" }),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_FOUND)

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should send a message", async () => {
      const player = new Player(
        { username: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      const opponent = new Player(
        { username: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socketId132312",
      )
      game.addPlayer(opponent)

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onMessage(socket, {
        username: "player2",
        message: "Hello!",
      })

      expect(socket.volatile.emit).toHaveBeenCalledOnce()
    })
  })

  describe("onWizz", () => {
    it("should throw if player is not in the game", async () => {
      const opponent = new Player(
        { username: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      socket.data.gameCode = game.code

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onWizz(socket, opponent.name)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should send a message", async () => {
      const player = new Player(
        { username: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      const opponent = new Player(
        { username: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socketId132312",
      )
      game.addPlayer(opponent)

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onWizz(socket, opponent.name)

      expect(socket.to).toHaveBeenCalledOnce()
    })
  })
})
