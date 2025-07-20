import {
  Constants as CoreConstants,
  type CreatePlayer,
  Game,
  Player,
  Settings,
} from "@skymo/core"
import { Constants as ErrorConstants } from "@skymo/error"
import type { UpdateGameSettings } from "@skymo/shared/validations"
import {
  mockRedisInService,
  mockSocket,
  mockSocketManagerInService,
} from "@tests/_mock.js"
import { TEST_SOCKET_ID } from "@tests/constants-test.js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LobbyService } from "@/realtime/lobby/lobby.service.js"
import type { GameSocket } from "@/realtime/types/gameSocket.js"

describe("LobbyService", () => {
  let service: LobbyService
  let socket: GameSocket

  beforeEach(() => {
    service = new LobbyService()
    mockRedisInService(service)
    mockSocketManagerInService(service)

    socket = mockSocket()
  })

  it("should be defined", () => {
    expect(LobbyService).toBeDefined()
  })

  describe("onCreate", () => {
    it("should create a new private game", async () => {
      const player: CreatePlayer = {
        name: "player1",
        avatar: CoreConstants.AVATARS.BEE,
      }

      await service.onCreate(socket, player)

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(1, {
        room: socket.data.gameCode,
        event: "game:update",
        data: expect.arrayContaining([
          expect.objectContaining({
            addPlayers: [
              expect.objectContaining({
                id: socket.data.playerId,
              }),
            ],
          }),
        ]),
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(2, {
        room: socket.data.gameCode,
        event: "message:server",
        data: expect.arrayContaining([
          expect.objectContaining({
            type: CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_JOINED,
            name: player.name,
          }),
        ]),
      })

      expect(service["socketManager"].sendToSocket).toHaveBeenNthCalledWith(
        1,
        socket,
        {
          event: "game:join",
          data: [
            socket.data.gameCode,
            CoreConstants.GAME_STATUS.LOBBY,
            socket.data.playerId,
            expect.any(String),
          ],
        },
      )
    })

    it("should create a new public game", async () => {
      const player: CreatePlayer = {
        name: "player1",
        avatar: CoreConstants.AVATARS.BEE,
      }

      await service.onCreate(socket, player, false)

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(1, {
        room: socket.data.gameCode,
        event: "game:update",
        data: expect.arrayContaining([
          expect.objectContaining({
            addPlayers: [
              expect.objectContaining({
                id: socket.data.playerId,
              }),
            ],
          }),
        ]),
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(2, {
        room: socket.data.gameCode,
        event: "message:server",
        data: expect.arrayContaining([
          expect.objectContaining({
            type: CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_JOINED,
            name: player.name,
          }),
        ]),
      })

      expect(service["socketManager"].sendToSocket).toHaveBeenNthCalledWith(
        1,
        socket,
        {
          event: "game:join",
          data: [
            socket.data.gameCode,
            CoreConstants.GAME_STATUS.LOBBY,
            socket.data.playerId,
            expect.any(String),
          ],
        },
      )
    })
  })

  describe("onJoin", () => {
    it("should throw if it's full", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const opponent2 = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )

      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.settings.maxPlayers = 2

      game.addPlayer(opponent)
      game.addPlayer(opponent2)

      const player: CreatePlayer = {
        name: "player2",
        avatar: CoreConstants.AVATARS.BEE,
      }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(
        service.onJoin(socket, game.code, player),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.GAME_IS_FULL)

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should throw if the player is banned", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )

      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      game.bannedNames = ["playerNameXX"]

      const player: CreatePlayer = {
        name: "playerNameXX",
        avatar: CoreConstants.AVATARS.BEE,
      }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(
        service.onJoin(socket, game.code, player),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_BANNED)

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("sould throw if game already started", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const opponent2 = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )

      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })

      game.addPlayer(opponent)
      game.addPlayer(opponent2)

      await game.start()

      const player: CreatePlayer = {
        name: "player2",
        avatar: CoreConstants.AVATARS.BEE,
      }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(
        service.onJoin(socket, game.code, player),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.GAME_ALREADY_STARTED)

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should join the game", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )

      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })

      game.addPlayer(opponent)

      const player: CreatePlayer = {
        name: "player2",
        avatar: CoreConstants.AVATARS.BEE,
      }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onJoin(socket, game.code, player)

      expect(game.players.length).toBe(2)
      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(1, {
        room: socket.data.gameCode,
        event: "game:update",
        data: expect.arrayContaining([
          expect.objectContaining({
            addPlayers: [
              expect.objectContaining({
                id: socket.data.playerId,
              }),
            ],
          }),
        ]),
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenNthCalledWith(2, {
        room: socket.data.gameCode,
        event: "message:server",
        data: expect.arrayContaining([
          expect.objectContaining({
            type: CoreConstants.SERVER_MESSAGE_TYPE.PLAYER_JOINED,
            name: player.name,
          }),
        ]),
      })

      expect(service["socketManager"].sendToSocket).toHaveBeenNthCalledWith(
        1,
        socket,
        {
          event: "game:join",
          data: [
            socket.data.gameCode,
            CoreConstants.GAME_STATUS.LOBBY,
            socket.data.playerId,
            expect.any(String),
          ],
        },
      )
    })

    it("should throw if authenticated user is already connected", async () => {
      const userId = 123

      const existingPlayer = new Player(
        { name: "ExistingPlayer", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
        userId, // userId
      )

      const game = new Game({
        hostId: existingPlayer.id,
        settings: new Settings(false),
      })

      game.addPlayer(existingPlayer)

      // Debug: verify the game has the player with the right userId
      expect(game.hasUserAlreadyJoined(userId)).toBe(true)
      expect(game.getPlayerByUserId(userId)).toBeDefined()

      const player: CreatePlayer = {
        name: "NewPlayer", // Different name to avoid ban confusion
        avatar: CoreConstants.AVATARS.BEE,
      }

      // Mock socket with the same userId as existing player
      const socketWithExistingUserId = mockSocket()
      socketWithExistingUserId.user = { id: userId } as any // Type assertion to avoid TS error

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(
        service.onJoin(socketWithExistingUserId, game.code, player),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_ALREADY_CONNECTED)
    })

    it("should allow guest users to join even if not unique", async () => {
      const existingPlayer = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
        // No userId - guest user
      )

      const game = new Game({
        hostId: existingPlayer.id,
        settings: new Settings(false),
      })

      game.addPlayer(existingPlayer)

      const player: CreatePlayer = {
        name: "player2",
        avatar: CoreConstants.AVATARS.BEE,
      }

      // Mock socket without userId (guest user)
      const guestSocket = mockSocket()
      guestSocket.user = undefined

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      // Should not throw for guest users
      await service.onJoin(guestSocket, game.code, player)

      expect(game.players.length).toBe(2)
      expect(service["socketManager"].sendToRoom).toHaveBeenCalled()
    })

    it("should allow different authenticated users to join", async () => {
      const existingPlayer = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
        123, // userId
      )

      const game = new Game({
        hostId: existingPlayer.id,
        settings: new Settings(false),
      })

      game.addPlayer(existingPlayer)

      const player: CreatePlayer = {
        name: "player2",
        avatar: CoreConstants.AVATARS.BEE,
      }

      // Mock socket with different userId
      const socketWithDifferentUserId = mockSocket()
      socketWithDifferentUserId.user = { id: 456 } as any

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      // Should not throw for different user
      await service.onJoin(socketWithDifferentUserId, game.code, player)

      expect(game.players.length).toBe(2)
      expect(service["socketManager"].sendToRoom).toHaveBeenCalled()
    })
  })

  describe("onResetSettings", () => {
    it("should throw if user is not host", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )

      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onResetSettings(socket)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.NOT_ALLOWED,
      )

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should throw if settings are already confirmed for a public game", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.addPlayer(player)

      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      game.addPlayer(opponent)
      socket.data = { gameCode: game.code, playerId: player.id }

      game.settings.isConfirmed = true

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onResetSettings(socket)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.NOT_ALLOWED,
      )

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should reset game settings if settings are confirmed for a private game", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(true),
      })
      // custom settings
      game.settings.cardPerColumn = 1
      game.settings.cardPerRow = 1
      game.settings.initialTurnedCount = 1
      game.settings.scoreToEndGame = 1
      game.settings.firstPlayerMultiplierPenalty = 1
      game.settings.removeIdenticalColumn = true
      game.settings.removeIdenticalRow = true
      game.settings.maxPlayers = 2

      game.addPlayer(player)

      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      game.addPlayer(opponent)
      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onResetSettings(socket)

      expect(game.settings.toJson()).toStrictEqual(
        new Settings(true, game.settings.maxPlayers).toJson(),
      )
      expect(service["socketManager"].sendToRoom).toHaveBeenCalled()
    })

    it("should reset game settings", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.addPlayer(player)

      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onResetSettings(socket)

      expect(game.settings).toBeInstanceOf(Settings)
      expect(game.settings.toJson()).toStrictEqual(new Settings(false).toJson())
    })
  })

  describe("onUpdateMaxPlayers", () => {
    it("should throw if user is not host", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )

      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onUpdateMaxPlayers(socket, 3)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.NOT_ALLOWED,
      )

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should update max players settings if game is private", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(true),
      })
      game.addPlayer(player)

      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      game.addPlayer(opponent)
      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      const newMaxPlayers = 3
      await service.onUpdateMaxPlayers(socket, newMaxPlayers)

      expect(game.settings.toJson()).toStrictEqual({
        ...game.settings.toJson(),
        maxPlayers: newMaxPlayers,
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenCalled()
    })
    it("should update max players settings if game is public and not confirmed", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.settings.isConfirmed = false
      game.addPlayer(player)

      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      game.addPlayer(opponent)
      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      const newMaxPlayers = 3
      await service.onUpdateMaxPlayers(socket, newMaxPlayers)

      expect(game.settings.toJson()).toStrictEqual({
        ...game.settings.toJson(),
        maxPlayers: newMaxPlayers,
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenCalled()
    })
    it("should update max players settings if game is public and confirmed", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.settings.isConfirmed = true
      game.addPlayer(player)

      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      game.addPlayer(opponent)
      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      const newMaxPlayers = 3
      await service.onUpdateMaxPlayers(socket, newMaxPlayers)

      expect(game.settings.toJson()).toStrictEqual({
        ...game.settings.toJson(),
        maxPlayers: newMaxPlayers,
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenCalled()
    })
  })

  describe("onUpdateSettings", () => {
    it("should throw if user is not host", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )

      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      const newSettings: UpdateGameSettings = {
        removeIdenticalColumn: true,
        removeIdenticalRow: true,
        initialTurnedCount: 2,
        cardPerRow: 6,
        cardPerColumn: 8,
        scoreToEndGame: 100,
        firstPlayerMultiplierPenalty: 2,
      }

      await expect(
        service.onUpdateSettings(socket, newSettings),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.NOT_ALLOWED)

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should throw if settings are already confirmed for a public game", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.addPlayer(player)

      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      game.addPlayer(opponent)
      socket.data = { gameCode: game.code, playerId: player.id }

      game.settings.isConfirmed = true

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      const newSettings: UpdateGameSettings = {
        scoreToEndGame: 200,
      }

      await expect(
        service.onUpdateSettings(socket, newSettings),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.NOT_ALLOWED)

      expect(socket.emit).not.toHaveBeenCalled()
    })

    it("should update game settings if settings are confirmed for a private game", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(true),
      })
      game.addPlayer(player)

      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      game.addPlayer(opponent)
      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      const newSettings: UpdateGameSettings = {
        scoreToEndGame: 200,
      }

      await service.onUpdateSettings(socket, newSettings)

      expect(game.settings.toJson()).toStrictEqual({
        ...game.settings.toJson(),
        ...newSettings,
      })

      expect(service["socketManager"].sendToRoom).toHaveBeenCalled()
    })

    it("should change one game setting", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.addPlayer(player)

      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      const newSettings: UpdateGameSettings = {
        removeIdenticalColumn: false,
      }

      await service.onUpdateSettings(socket, newSettings)

      expect(game.settings).toBeInstanceOf(Settings)
      expect(game.settings.toJson()).toStrictEqual({
        ...game.settings,
        ...newSettings,
        private: game.settings.private,
        maxPlayers: 8,
        isConfirmed: game.settings.isConfirmed,
      })
    })

    it("should change multiple game settings", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.addPlayer(player)

      socket.data = { gameCode: game.code, playerId: player.id }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      const newSettings: UpdateGameSettings = {
        removeIdenticalColumn: true,
        removeIdenticalRow: true,
        initialTurnedCount: 2,
        cardPerRow: 6,
        cardPerColumn: 8,
        scoreToEndGame: 100,
        firstPlayerMultiplierPenalty: 2,
      }

      await service.onUpdateSettings(socket, newSettings)

      expect(game.settings).toBeInstanceOf(Settings)
      expect(game.settings.toJson()).toStrictEqual({
        ...game.settings,
        ...newSettings,
        private: game.settings.private,
        isConfirmed: game.settings.isConfirmed,
      })
    })
  })

  describe("onToggleSettingsValidation", () => {
    it("should do nothing if game is private", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(true),
      })
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      expect(game.settings.isConfirmed).toBeTruthy()

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onToggleSettingsValidation(socket)

      expect(game.settings.isConfirmed).toBeTruthy()
    })

    it("should set the settings validation to true", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onToggleSettingsValidation(socket)

      expect(game.settings.isConfirmed).toBeTruthy()
    })
  })

  describe("onStartCountdown", () => {
    it("should throw if user is not host", async () => {
      const host = new Player(
        { name: "host", avatar: CoreConstants.AVATARS.PENGUIN },
        "host-socket",
      )
      const notHost = new Player(
        { name: "notHost", avatar: CoreConstants.AVATARS.BEE },
        TEST_SOCKET_ID,
      )
      const game = new Game({ hostId: host.id, settings: new Settings(false) })
      game.addPlayer(host)
      game.addPlayer(notHost)
      socket.data = { gameCode: game.code, playerId: notHost.id }
      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onStartCountdown(socket)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.NOT_ALLOWED,
      )
    })

    it("should throw if countdown already exists", async () => {
      const host = new Player(
        { name: "host", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({ hostId: host.id, settings: new Settings(false) })
      game.addPlayer(host)

      socket.data = { gameCode: game.code, playerId: host.id }
      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      service["countdownQueue"].coundownExists = vi.fn(() =>
        Promise.resolve(true),
      )

      await expect(service.onStartCountdown(socket)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.NOT_ALLOWED,
      )
    })

    it("should call startCountdown if host and no countdown exists", async () => {
      const host = new Player(
        { name: "host", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({ hostId: host.id, settings: new Settings(false) })
      game.addPlayer(host)
      socket.data = { gameCode: game.code, playerId: host.id }
      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      service["countdownQueue"].coundownExists = vi.fn(() =>
        Promise.resolve(false),
      )
      const startCountdown = vi.fn(() => Promise.resolve())
      service["countdownQueue"].startCountdown = startCountdown

      await service.onStartCountdown(socket)

      expect(startCountdown).toHaveBeenCalledWith(game.code)
    })
  })

  describe("onCancelCountdown", () => {
    it("should throw if user is not host", async () => {
      const host = new Player(
        { name: "host", avatar: CoreConstants.AVATARS.PENGUIN },
        "host-socket",
      )
      const notHost = new Player(
        { name: "notHost", avatar: CoreConstants.AVATARS.BEE },
        TEST_SOCKET_ID,
      )
      const game = new Game({ hostId: host.id, settings: new Settings(false) })
      game.addPlayer(host)
      game.addPlayer(notHost)
      socket.data = { gameCode: game.code, playerId: notHost.id }
      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onCancelCountdown(socket)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.NOT_ALLOWED,
      )
    })

    it("should call cancelCountdown if host", async () => {
      const host = new Player(
        { name: "host", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({ hostId: host.id, settings: new Settings(false) })
      game.addPlayer(host)
      socket.data = { gameCode: game.code, playerId: host.id }
      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      const cancelCountdown = vi.fn(() => Promise.resolve())
      service["countdownQueue"].cancelCountdown = cancelCountdown

      await service.onCancelCountdown(socket)

      expect(cancelCountdown).toHaveBeenCalledWith(game.code)
    })
  })
})
