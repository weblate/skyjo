import {
  Card,
  type ConnectionStatus,
  Constants as CoreConstants,
  Game,
  Player,
  Settings,
} from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import type { LastGame } from "@skymo/shared/validations"
import {
  mockGameOperationManager,
  mockRedisInService,
  mockSocket,
  mockSocketManagerInService,
} from "@tests/_mock.js"
import {
  RANDOM_SOCKET_ID,
  TEST_SOCKET_ID,
  TEST_UNKNOWN_GAME_ID,
} from "@tests/constants-test.js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PlayerService } from "@/realtime/player/player.service.js"
import type { GameSocket } from "@/realtime/types/gameSocket.js"

describe("PlayerService", () => {
  let service: PlayerService
  let socket: GameSocket

  beforeEach(() => {
    service = new PlayerService()
    mockRedisInService(service)
    mockSocketManagerInService(service)

    socket = mockSocket()
  })

  describe("onConnectionLost", () => {
    it("should do nothing if player not found", async () => {
      const game = new Game({
        hostId: RANDOM_SOCKET_ID(),
        settings: new Settings(false),
      })

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onConnectionLost(socket)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )
    })

    it("should set the player connection status to lost when game is playing", async () => {
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

      // Set game to playing state
      game.status = CoreConstants.GAME_STATUS.PLAYING

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onConnectionLost(socket)

      expect(game.players[0].connectionStatus).toBe(
        CoreConstants.CONNECTION_STATUS.LOST,
      )
    })

    it("should disconnect the player when game is in lobby", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      game.status = CoreConstants.GAME_STATUS.LOBBY

      const disconnectPlayerSpy = vi.spyOn(game, "disconnectPlayer")

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      vi.spyOn(service["countdownQueue"], "coundownExists").mockResolvedValue(
        false,
      )

      await service.onConnectionLost(socket)

      expect(disconnectPlayerSpy).toHaveBeenCalledWith(player)
    })

    it("should disconnect the player when game is stopped", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      game.status = CoreConstants.GAME_STATUS.STOPPED

      const disconnectPlayerSpy = vi.spyOn(game, "disconnectPlayer")

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onConnectionLost(socket)

      expect(disconnectPlayerSpy).toHaveBeenCalledWith(player)
    })

    it("should cancel countdown if game is in lobby and countdown exists", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id
      game.status = CoreConstants.GAME_STATUS.LOBBY

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      const cancelCountdownSpy = vi
        .spyOn(service["countdownQueue"], "cancelCountdown")
        .mockResolvedValue()
      vi.spyOn(service["countdownQueue"], "coundownExists").mockResolvedValue(
        true,
      )

      await service.onConnectionLost(socket)
      expect(cancelCountdownSpy).toHaveBeenCalledWith(game.code)
    })

    it("should not cancel countdown if game is in lobby and countdown does not exist", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id
      game.status = CoreConstants.GAME_STATUS.LOBBY

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      const cancelCountdownSpy = vi
        .spyOn(service["countdownQueue"], "cancelCountdown")
        .mockResolvedValue()
      vi.spyOn(service["countdownQueue"], "coundownExists").mockResolvedValue(
        false,
      )

      await service.onConnectionLost(socket)
      expect(cancelCountdownSpy).not.toHaveBeenCalled()
    })
  })

  describe("onLeave", () => {
    it("should do nothing if game not found", async () => {
      socket.data.gameCode = TEST_UNKNOWN_GAME_ID

      service["redis"].getGame = vi.fn(() =>
        Promise.reject(
          new CError("", { code: ErrorConstants.ERROR.GAME_NOT_FOUND }),
        ),
      )

      await expect(service.onLeave(socket)).not.toThrowCErrorWithCode(
        ErrorConstants.ERROR.GAME_NOT_FOUND,
      )
    })

    it("should throw if player is not in the game", async () => {
      const opponent = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socketId132312",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      socket.data.gameCode = game.code

      const opponent2 = new Player(
        { name: "opponent2", avatar: CoreConstants.AVATARS.TURTLE },
        "socketId9887",
      )
      game.addPlayer(opponent2)
      await game.start()

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onLeave(socket)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )
    })

    it("should remove the player from the game if the game is in lobby", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(opponent)

      const player = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id
      socket.data.playerId = player.id

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onLeave(socket)

      expect(game.isInLobby()).toBeTruthy()
      expect(game.players.length).toBe(1)
    })

    it("should set the player to leave state and let the game goes", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(opponent)

      const player = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      const opponent2 = new Player(
        { name: "opponent2", avatar: CoreConstants.AVATARS.TURTLE },
        "socketId9887",
      )
      game.addPlayer(opponent2)

      await game.start()

      player.cards[0][0] = new Card(11)
      player.cards[0][1] = new Card(11)

      opponent.cards[0][0] = new Card(12)
      opponent.cards[0][1] = new Card(12)

      opponent2.cards[0][0] = new Card(11)
      opponent2.cards[0][1] = new Card(11)

      opponent.turnCard(0, 0)
      opponent.turnCard(0, 1)
      opponent2.turnCard(0, 0)
      opponent2.turnCard(0, 1)

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onLeave(socket)

      expect(player.connectionStatus).toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.LEAVE,
      )
      expect(game.isPlaying()).toBeTruthy()
      expect(game.players.length).toBe(3)
    })

    it("should set DISCONNECTED status when leaving in lobby", async () => {
      // Edge case test: Player leaves in lobby should get DISCONNECTED, not LEAVE
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(opponent)

      const player = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      // Game is still in lobby
      expect(game.isInLobby()).toBeTruthy()

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onLeave(socket)

      // Player should be DISCONNECTED in lobby, not LEAVE
      expect(player.connectionStatus).toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.DISCONNECTED,
      )
      expect(player.connectionStatus).not.toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.LEAVE,
      )
      expect(game.players.length).toBe(1)
    })

    it("should not remove the player if the game is finished", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(opponent)

      const player = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      await game.start()

      player.cards[0][0] = new Card(11)
      player.cards[0][1] = new Card(11)

      opponent.cards[0][0] = new Card(12)
      opponent.cards[0][1] = new Card(12)

      opponent.turnCard(0, 0)
      opponent.turnCard(0, 1)

      game.roundPhase = CoreConstants.ROUND_PHASE.OVER
      game.status = CoreConstants.GAME_STATUS.FINISHED

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onLeave(socket)

      expect(game.isFinished()).toBeTruthy()
      expect(game.isRoundOver()).toBeTruthy()
      expect(game.players.length).toBe(2)
    })

    it("should remove the player and the game if they are no more players", async () => {
      const player = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(player)

      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      const removeGameSpy = vi.spyOn(game["operationManager"], "removeGame")

      await service.onLeave(socket)

      expect(removeGameSpy).not.toHaveBeenCalledWith(game.code)

      removeGameSpy.mockClear()
    })

    it("should cancel countdown if game is in lobby and countdown exists", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id
      game.status = CoreConstants.GAME_STATUS.LOBBY

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      const cancelCountdownSpy = vi
        .spyOn(service["countdownQueue"], "cancelCountdown")
        .mockResolvedValue()
      vi.spyOn(service["countdownQueue"], "coundownExists").mockResolvedValue(
        true,
      )

      await service.onLeave(socket)
      expect(cancelCountdownSpy).toHaveBeenCalledWith(game.code)
    })

    it("should not cancel countdown if game is in lobby and countdown does not exist", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id
      game.status = CoreConstants.GAME_STATUS.LOBBY

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      const cancelCountdownSpy = vi
        .spyOn(service["countdownQueue"], "cancelCountdown")
        .mockResolvedValue()
      vi.spyOn(service["countdownQueue"], "coundownExists").mockResolvedValue(
        false,
      )

      await service.onLeave(socket)
      expect(cancelCountdownSpy).not.toHaveBeenCalled()
    })
  })

  describe("onReconnect", () => {
    it("should throw if player cannot reconnect", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      const opponent = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socketId132312",
      )
      game.addPlayer(opponent)

      game.settings.initialTurnedCount = 0
      await game.start()

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onLeave(socket)
      const lastGame: LastGame = {
        sessionId: player.getSessionId(),
        gameCode: game.code,
        playerId: player.id,
      }

      service["redis"].canReconnectPlayer = vi.fn(() => Promise.resolve(false))

      await expect(service.onReconnect(socket, lastGame)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.CANNOT_RECONNECT,
      )
    })

    it("should reconnect the player if in the time limit", async () => {
      const player = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      const game = new Game({
        hostId: player.id,
        settings: new Settings(false),
      })
      mockGameOperationManager(game)

      game.addPlayer(player)

      const opponent = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socketId132312",
      )
      game.addPlayer(opponent)

      game.settings.initialTurnedCount = 0
      await game.start()

      socket.data = {
        gameCode: game.code,
        playerId: player.id,
      }
      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onLeave(socket)

      expect(player.connectionStatus).toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.LEAVE,
      )

      const lastGame: LastGame = {
        sessionId: player.getSessionId(),
        gameCode: game.code,
        playerId: player.id,
      }

      service["redis"].canReconnectPlayer = vi.fn(() => Promise.resolve(true))

      await service.onReconnect(socket, lastGame)

      expect(player.connectionStatus).toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.CONNECTED,
      )
    })

    it("should reconnect the player if no time limit", async () => {
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
        { name: "player2", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socketId132312",
      )
      game.addPlayer(opponent)

      game.settings.initialTurnedCount = 0
      await game.start()

      socket.data = {
        gameCode: game.code,
        playerId: player.id,
      }
      const lastGame: LastGame = {
        sessionId: player.getSessionId(),
        gameCode: game.code,
        playerId: player.id,
      }

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))
      service["redis"].canReconnectPlayer = vi.fn(() => Promise.resolve(true))

      await service.onReconnect(socket, lastGame)

      expect(player.connectionStatus).toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.CONNECTED,
      )
    })
  })

  describe("onRecover", () => {
    it("should properly recover player with LEAVE status during game", async () => {
      // Edge case test: Player leaves during game, then recovers
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
        { name: "player2", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      await game.start()

      // Simulate player leaving during game
      player.connectionStatus = CoreConstants.CONNECTION_STATUS.LEAVE

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onRecover(socket)

      // Player should now be CONNECTED, not LEAVE
      expect(player.connectionStatus).toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.CONNECTED,
      )
      expect(player.connectionStatus).not.toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.LEAVE,
      )
    })

    it("should throw if player not found", async () => {
      vi.useFakeTimers()

      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      const opponent2 = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.PENGUIN },
        "socketId9887",
      )
      game.addPlayer(opponent2)

      const player = new Player(
        { name: "player3", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = crypto.randomUUID()

      await game.start()

      opponent.cards = [[new Card(1), new Card(1)]]
      opponent2.cards = [[new Card(1), new Card(1)]]

      player.connectionStatus = CoreConstants.CONNECTION_STATUS.LOST

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await expect(service.onRecover(socket)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )

      expect(player.connectionStatus).toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.LOST,
      )
    })

    it("should set the player as connected and clear the disconnection timeout", async () => {
      const opponent = new Player(
        { name: "player1", avatar: CoreConstants.AVATARS.ELEPHANT },
        "socket456",
      )
      const game = new Game({
        hostId: opponent.id,
        settings: new Settings(false),
      })
      game.addPlayer(opponent)

      const opponent2 = new Player(
        { name: "player2", avatar: CoreConstants.AVATARS.PENGUIN },
        "socketId9887",
      )
      game.addPlayer(opponent2)

      const player = new Player(
        { name: "player3", avatar: CoreConstants.AVATARS.PENGUIN },
        TEST_SOCKET_ID,
      )
      game.addPlayer(player)
      socket.data.gameCode = game.code
      socket.data.playerId = player.id

      await game.start()

      opponent.cards = [[new Card(1), new Card(1)]]
      opponent2.cards = [[new Card(1), new Card(1)]]

      player.connectionStatus = CoreConstants.CONNECTION_STATUS.LOST

      service["redis"].getGame = vi.fn(() => Promise.resolve(game))

      await service.onRecover(socket)

      expect(player.connectionStatus).toBe<ConnectionStatus>(
        CoreConstants.CONNECTION_STATUS.CONNECTED,
      )
    })
  })
})
