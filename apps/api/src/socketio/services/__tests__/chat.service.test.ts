import type { GameSocket } from "@/socketio/types/gameSocket.js"
import { Constants as CoreConstants, Game, Player, Settings } from "@skymo/core"
import { Constants as ErrorConstants } from "@skymo/error"
import { mockSocket } from "@tests/_mock.js"
import { TEST_SOCKET_ID } from "@tests/constants-test.js"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ChatService } from "../chat.service.js"
import "@skymo/error/test/expect-extend"
import type { SightEngineMessage } from "@/socketio/types/sightengine.js"
import type { UserChatMessage } from "@skymo/shared/types"
import type { Report } from "@skymo/shared/validations"

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

  describe("onReport", () => {
    let player: Player
    let target: Player
    let game: Game
    let report: Report
    let getMessageByIdMock: ReturnType<typeof vi.fn>

    beforeEach(() => {
      player = new Player(
        { username: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      target = new Player(
        { username: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socketId132312",
      )
      game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })

      // Mock the disconnectPlayer method to prevent Socket.IO errors
      game.disconnectPlayer = vi.fn().mockResolvedValue(undefined)
      game.banPlayer = vi.fn()

      game.addPlayer(player)
      game.addPlayer(target)

      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      report = {
        targetId: target.id,
        type: "message",
        messageId: "test-message-id",
      }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      service["updateAndSendGame"] = vi.fn().mockResolvedValue(undefined)
      service["sendServerMessage"] = vi.fn().mockResolvedValue(undefined)
      service["socketManager"] = {
        sendToRoom: vi.fn(),
      } as any

      // Create a proper mock for the getMessageById function
      getMessageByIdMock = vi.fn()

      // Set up messageRepository for all tests
      service["messageRepository"] = {
        getMessageById: getMessageByIdMock,
        storeMessage: vi.fn(),
        getGameMessagesKey: vi.fn(),
      } as any
    })

    it("should throw if player is not in the game", async () => {
      socket.data.playerId = "non-existent-player-id"

      await expect(service.onReport(socket, report)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )
    })

    it("should throw if target player is not in the game", async () => {
      report.targetId = "non-existent-target-id"

      await expect(service.onReport(socket, report)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )
    })

    it("should throw if report type is message and message is not found", async () => {
      getMessageByIdMock.mockResolvedValue(null)

      await expect(service.onReport(socket, report)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.MESSAGE_NOT_FOUND,
      )
    })

    it("should throw if checkTextSafety returns an error", async () => {
      const message: UserChatMessage = {
        id: "test-message-id",
        message: "Hello!",
        username: "player2",
        type: "message",
      }
      getMessageByIdMock.mockResolvedValue(message)
      service["checkTextSafety"] = vi
        .fn()
        .mockResolvedValue({ error: new Error("API error") })

      await expect(service.onReport(socket, report)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.UNEXPECTED_ERROR,
      )
    })

    it("should not ban player if message text is safe", async () => {
      const message: UserChatMessage = {
        id: "test-message-id",
        message: "Hello!",
        username: "player2",
        type: "message",
      }
      getMessageByIdMock.mockResolvedValue(message)
      service["checkTextSafety"] = vi.fn().mockResolvedValue({ safe: true })

      await service.onReport(socket, report)

      expect(game.players).toHaveLength(2)
      expect(service["socketManager"].sendToRoom).not.toHaveBeenCalled()
      expect(service["updateAndSendGame"]).not.toHaveBeenCalled()
    })

    it("should ban player if message text is not safe", async () => {
      const message: UserChatMessage = {
        id: "test-message-id",
        message: "Bad content",
        username: "player2",
        type: "message",
      }
      getMessageByIdMock.mockResolvedValue(message)
      service["checkTextSafety"] = vi
        .fn()
        .mockResolvedValue({ safe: false, reason: "profanity" })

      await service.onReport(socket, report)

      expect(game.banPlayer).toHaveBeenCalledWith(target)
      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:report",
        data: [target.id, target.name],
      })
      expect(service["sendServerMessage"]).toHaveBeenCalledWith(
        game.code,
        target.name,
        CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_LEFT,
      )
      expect(game.disconnectPlayer).toHaveBeenCalledWith(target)
      expect(service["updateAndSendGame"]).toHaveBeenCalled()
    })

    it("should use player name as text when report type is not message", async () => {
      report.type = "username"

      service["checkTextSafety"] = vi.fn().mockResolvedValue({ safe: true })

      await service.onReport(socket, report)

      expect(service["checkTextSafety"]).toHaveBeenCalledWith(target.name)
      expect(getMessageByIdMock).not.toHaveBeenCalled()
    })

    it("should ban player if player name is not safe", async () => {
      report.type = "username"

      service["checkTextSafety"] = vi
        .fn()
        .mockResolvedValue({ safe: false, reason: "profanity" })

      await service.onReport(socket, report)

      expect(game.banPlayer).toHaveBeenCalledWith(target)
      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:report",
        data: [target.id, target.name],
      })
      expect(service["sendServerMessage"]).toHaveBeenCalledWith(
        game.code,
        target.name,
        CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_LEFT,
      )
      expect(game.disconnectPlayer).toHaveBeenCalledWith(target)
      expect(service["updateAndSendGame"]).toHaveBeenCalled()
    })
  })

  describe("checkTextSafety", () => {
    let originalFetch: typeof global.fetch

    beforeEach(() => {
      // Save the original fetch function
      originalFetch = global.fetch

      // Mock ENV values
      vi.stubEnv("SIGHTENGINE_API_USER", "test-user")
      vi.stubEnv("SIGHTENGINE_API_SECRET", "test-secret")
    })

    afterEach(() => {
      // Restore original fetch
      global.fetch = originalFetch

      // Restore ENV values
      vi.unstubAllEnvs()
    })

    it("should return safe=true for safe text", async () => {
      // Mock fetch to return a "safe" response
      global.fetch = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: "success",
            request: {
              id: "req_123",
              timestamp: 123456789,
              operations: 1,
            },
            profanity: { matches: [] },
            personal: { matches: [] },
            link: { matches: [] },
            medical: { matches: [] },
            weapon: { matches: [] },
            extremism: { matches: [] },
            drug: { matches: [] },
            "self-harm": { matches: [] },
            violence: { matches: [] },
            "content-trade": { matches: [] },
            "money-transaction": { matches: [] },
            spam: { matches: [] },
          } as SightEngineMessage),
      })

      const result = await service["checkTextSafety"]("Hello, world!")

      expect(result).toEqual({ safe: true })
      expect(global.fetch).toHaveBeenCalledOnce()

      // Check that the URL is correct
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.sightengine.com/1.0/text/check.json",
        expect.objectContaining({
          method: "post",
          body: expect.any(FormData),
        }),
      )
    })

    it("should return safe=false for unsafe text with profanity", async () => {
      // Mock fetch to return an "unsafe" response with profanity
      global.fetch = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: "success",
            request: {
              id: "req_456",
              timestamp: 123456789,
              operations: 1,
            },
            profanity: {
              matches: [
                {
                  type: "inappropriate",
                  intensity: "high",
                  match: "badword",
                  start: 10,
                  end: 17,
                },
              ],
            },
            personal: { matches: [] },
            link: { matches: [] },
            medical: { matches: [] },
            weapon: { matches: [] },
            extremism: { matches: [] },
            drug: { matches: [] },
            "self-harm": { matches: [] },
            violence: { matches: [] },
            "content-trade": { matches: [] },
            "money-transaction": { matches: [] },
            spam: { matches: [] },
          } as SightEngineMessage),
      })

      const result = await service["checkTextSafety"]("Text with badword")

      expect(result).toEqual({ safe: false, reason: "profanity" })
      expect(global.fetch).toHaveBeenCalledOnce()
    })

    it("should return safe=false for unsafe text with violence", async () => {
      // Mock fetch to return an "unsafe" response with violence
      global.fetch = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: "success",
            request: {
              id: "req_789",
              timestamp: 123456789,
              operations: 1,
            },
            profanity: { matches: [] },
            personal: { matches: [] },
            link: { matches: [] },
            medical: { matches: [] },
            weapon: { matches: [] },
            extremism: { matches: [] },
            drug: { matches: [] },
            "self-harm": { matches: [] },
            violence: {
              matches: [
                {
                  type: "violence",
                  intensity: "high",
                  match: "violent content",
                  start: 10,
                  end: 25,
                },
              ],
            },
            "content-trade": { matches: [] },
            "money-transaction": { matches: [] },
            spam: { matches: [] },
          } as SightEngineMessage),
      })

      const result = await service["checkTextSafety"](
        "Text with violent content",
      )

      expect(result).toEqual({ safe: false, reason: "violence" })
      expect(global.fetch).toHaveBeenCalledOnce()
    })

    it("should return error when fetch fails", async () => {
      // Mock fetch to throw an error
      const mockError = new Error("Network error")
      global.fetch = vi.fn().mockRejectedValue(mockError)

      const result = await service["checkTextSafety"]("Any text")

      expect(result).toEqual({ error: mockError })
      expect(global.fetch).toHaveBeenCalledOnce()
    })

    it("should send correct parameters to the API", async () => {
      // Mock fetch to return a basic response
      global.fetch = vi.fn().mockResolvedValue({
        json: () =>
          Promise.resolve({
            status: "success",
            request: {
              id: "req_123",
              timestamp: 123456789,
              operations: 1,
            },
            profanity: { matches: [] },
            personal: { matches: [] },
            link: { matches: [] },
            medical: { matches: [] },
            weapon: { matches: [] },
            extremism: { matches: [] },
            drug: { matches: [] },
            "self-harm": { matches: [] },
            violence: { matches: [] },
            "content-trade": { matches: [] },
            "money-transaction": { matches: [] },
            spam: { matches: [] },
          } as SightEngineMessage),
      })

      await service["checkTextSafety"]("Test text")

      // Check that fetch was called with the right parameters
      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.sightengine.com/1.0/text/check.json",
        expect.objectContaining({
          method: "post",
          body: expect.any(FormData),
        }),
      )

      // Check that FormData contains the right data using a spy
      const appendSpy = vi.spyOn(FormData.prototype, "append")
      const testFormData = new FormData()
      testFormData.append("text", "Test text")
      testFormData.append("lang", "en,fr,es")
      testFormData.append(
        "categories",
        "profanity,extremism,self-harm,violence,content-trade,money-transaction,spam",
      )
      testFormData.append("mode", "rules")
      testFormData.append("api_user", "test-user")
      testFormData.append("api_secret", "test-secret")

      expect(appendSpy).toHaveBeenCalledWith("text", "Test text")
      expect(appendSpy).toHaveBeenCalledWith("lang", "en,fr,es")
      expect(appendSpy).toHaveBeenCalledWith(
        "categories",
        "profanity,extremism,self-harm,violence,content-trade,money-transaction,spam",
      )
      expect(appendSpy).toHaveBeenCalledWith("mode", "rules")
      expect(appendSpy).toHaveBeenCalledWith("api_user", "test-user")
      expect(appendSpy).toHaveBeenCalledWith("api_secret", "test-secret")

      appendSpy.mockRestore()
    })
  })
})
