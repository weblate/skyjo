import { Logger } from "@skymo/logger"
import { createAdapter } from "@socket.io/redis-streams-adapter"
import { Server as HttpServer } from "http"
import { createClient } from "redis"
import { Server } from "socket.io"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { GameSocket } from "@/realtime/types/gameSocket.js"
import { SocketManager } from "../SocketManager.js"

// Mock dependencies
vi.mock("redis", () => ({
  createClient: vi.fn(),
}))

vi.mock("socket.io", () => {
  const mockSocketsMap = new Map()

  return {
    Server: vi.fn().mockImplementation(() => ({
      sockets: {
        sockets: mockSocketsMap,
      },
      to: vi.fn().mockReturnThis(),
      emit: vi.fn(),
      fetchSockets: vi.fn().mockResolvedValue([]),
      disconnectSockets: vi.fn(),
      close: vi.fn((cb: () => void) => cb()),
    })),
    mockSocketsMap, // Expose the map for tests to modify
  }
})

vi.mock("@socket.io/redis-streams-adapter", () => ({
  createAdapter: vi.fn(),
}))

vi.mock("@skymo/logger", () => ({
  Logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// Create a mock game data object for tests
const createMockGameData = () => ({
  code: "game-123",
  status: "waiting",
  hostId: "host-123",
  players: [],
  turn: 0,
  settings: {
    isConfirmed: true,
    private: false,
    maxPlayers: 4,
    removeIdenticalColumn: false,
    removeIdenticalRow: false,
    initialTurnedCount: 2,
    cardPerRow: 4,
    cardPerColumn: 3,
    scoreToEndGame: 80,
    firstPlayerMultiplierPenalty: 2,
    firstPlayerFlatPenalty: 10,
    firstPlayerPenaltyType: "multiplier",
    showCurrentScore: true,
  },
  selectedCardValue: null,
  roundPhase: "not_started",
  turnStatus: "waiting",
  lastTurnStatus: "waiting",
  stateVersion: 1,
  updatedAt: new Date(),
})

describe("SocketManager", () => {
  let socketManager: SocketManager
  let mockHttpServer: HttpServer
  let mockRedisClient: any
  let mockSocket: GameSocket
  let mockSocketsMap: Map<string, GameSocket>

  beforeEach(() => {
    vi.clearAllMocks()

    // Reset the singleton instance
    // @ts-expect-error - Accessing private static property for testing
    SocketManager.instance = undefined

    socketManager = SocketManager.getInstance()
    mockHttpServer = new HttpServer()

    mockRedisClient = {
      connect: vi.fn().mockResolvedValue(undefined),
      quit: vi.fn().mockResolvedValue(undefined),
      destroy: vi.fn().mockResolvedValue(undefined),
      on: vi.fn(),
    }

    mockSocket = {
      id: "player-123",
      connected: true,
      emit: vi.fn(),
      disconnect: vi.fn(),
    } as unknown as GameSocket

    // Reset the mock sockets map
    mockSocketsMap =
      vi.mocked(Server).mock.results[0]?.value.sockets.sockets ?? new Map()
    mockSocketsMap.clear()

    // Mock implementation
    vi.mocked(createClient).mockReturnValue(mockRedisClient)
  })

  describe("getInstance", () => {
    it("should return the same instance when called multiple times", () => {
      const instance1 = SocketManager.getInstance()
      const instance2 = SocketManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe("setIO", () => {
    it("should initialize Redis clients and Socket.IO server", async () => {
      await socketManager.setIO(mockHttpServer)

      expect(createClient).toHaveBeenCalledTimes(1)
      expect(mockRedisClient.connect).toHaveBeenCalledTimes(1)
      expect(Server).toHaveBeenCalledTimes(1)
      expect(createAdapter).toHaveBeenCalledWith(mockRedisClient)
      expect(socketManager.isInitialized()).toBe(true)
    })

    it("should not initialize again if already initialized", async () => {
      await socketManager.setIO(mockHttpServer)
      await socketManager.setIO(mockHttpServer)

      expect(Server).toHaveBeenCalledTimes(1)
    })

    it("should handle Redis connection errors", async () => {
      const connectionError = new Error("Connection failed")
      mockRedisClient.connect.mockRejectedValueOnce(connectionError)

      await expect(socketManager.setIO(mockHttpServer)).rejects.toThrow(
        connectionError,
      )

      expect(mockRedisClient.destroy).toHaveBeenCalledTimes(1)
      expect(socketManager.isInitialized()).toBe(false)
    })

    it("should set up reconnection strategy for Redis", async () => {
      await socketManager.setIO(mockHttpServer)

      // Extract the reconnectStrategy function
      const reconnectStrategyFn = (
        createClient as unknown as ReturnType<typeof vi.fn>
      ).mock.calls[0][0].socket.reconnectStrategy

      expect(reconnectStrategyFn(1)).toBe(100) // 1 retry -> 100ms
      expect(reconnectStrategyFn(5)).toBe(500) // 5 retries -> 500ms
      expect(() => reconnectStrategyFn(6)).toThrow(
        "Redis client connection failed after 5 retries",
      )
    })

    it("should register error handlers for Redis client", async () => {
      await socketManager.setIO(mockHttpServer)

      expect(mockRedisClient.on).toHaveBeenCalledWith(
        "error",
        expect.any(Function),
      )
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        "connect",
        expect.any(Function),
      )
      expect(mockRedisClient.on).toHaveBeenCalledWith(
        "disconnect",
        expect.any(Function),
      )

      // Trigger error handler
      const errorHandler = mockRedisClient.on.mock.calls.find(
        (call: any[]) => call[0] === "error",
      )[1]
      errorHandler(new Error("Redis error"))

      expect(Logger.error).toHaveBeenCalledWith(
        "Redis Client Error",
        expect.any(Object),
      )
    })
  })

  describe("getIO", () => {
    it("should return the initialized Socket.IO instance", async () => {
      await socketManager.setIO(mockHttpServer)

      expect(socketManager.getIO()).toBeDefined()
    })

    it("should throw error if Socket.IO is not initialized", () => {
      expect(() => socketManager.getIO()).toThrow(
        "Socket.IO server not initialized",
      )
    })
  })

  describe("getSocket", () => {
    it("should return the socket for the given player ID", async () => {
      await socketManager.setIO(mockHttpServer)
      socketManager.getIO().sockets.sockets.set("player-123", mockSocket)

      const socket = socketManager.getSocket("player-123")

      expect(socket).toBe(mockSocket)
    })

    it("should return undefined if socket not found", async () => {
      await socketManager.setIO(mockHttpServer)

      const socket = socketManager.getSocket("non-existent")

      expect(socket).toBeUndefined()
    })
  })

  describe("sendToSocket", () => {
    it("should emit event to the socket", async () => {
      await socketManager.setIO(mockHttpServer)

      const mockGameData = createMockGameData()

      socketManager.sendToSocket(mockSocket, {
        event: "game",
        data: [mockGameData],
      })

      expect(mockSocket.emit).toHaveBeenCalledWith("game", mockGameData)
    })

    it("should not emit if socket is disconnected", async () => {
      await socketManager.setIO(mockHttpServer)

      mockSocket.connected = false

      const mockGameData = createMockGameData()

      socketManager.sendToSocket(mockSocket, {
        event: "game",
        data: [mockGameData],
      })

      expect(mockSocket.emit).not.toHaveBeenCalled()
      expect(Logger.debug).toHaveBeenCalled()
    })
  })

  describe("sendToRoom", () => {
    it("should emit event to the room", async () => {
      await socketManager.setIO(mockHttpServer)

      const io = socketManager.getIO()

      const mockGameData = createMockGameData()

      socketManager.sendToRoom({
        room: "game-123",
        event: "game",
        data: [mockGameData],
      })

      expect(io.to).toHaveBeenCalledWith("game-123")
      expect(io.emit).toHaveBeenCalledWith("game", mockGameData)
    })
  })

  describe("sendGameToSocket", () => {
    it("should emit game to the socket", async () => {
      await socketManager.setIO(mockHttpServer)

      const io = socketManager.getIO()
      const mockGameData = createMockGameData()

      const mockGame = {
        toJson: vi.fn().mockReturnValue(mockGameData),
      }

      socketManager.sendGameToSocket("player-123", mockGame as any)

      expect(io.to).toHaveBeenCalledWith("player-123")
      expect(io.emit).toHaveBeenCalledWith("game", mockGameData)
    })
  })

  describe("cleanup", () => {
    it("should close Socket.IO server and disconnect Redis clients", async () => {
      await socketManager.setIO(mockHttpServer)

      const io = socketManager.getIO()
      io.fetchSockets = vi
        .fn()
        .mockResolvedValue([{ disconnect: vi.fn() }, { disconnect: vi.fn() }])

      await socketManager.cleanup()

      expect(io.fetchSockets).toHaveBeenCalled()
      expect(io.disconnectSockets).toHaveBeenCalledWith(true)
      expect(io.close).toHaveBeenCalled()
      expect(mockRedisClient.destroy).toHaveBeenCalled()
      expect(socketManager.isInitialized()).toBe(false)
    })

    it("should handle errors during Socket.IO server close", async () => {
      await socketManager.setIO(mockHttpServer)

      const io = socketManager.getIO()
      const closeError = new Error("Close failed")
      io.close = vi.fn((_cb: () => void) => {
        throw closeError
      })

      await socketManager.cleanup()

      expect(Logger.error).toHaveBeenCalledWith(
        "Error closing Socket.IO server",
        expect.objectContaining({
          error: closeError,
        }),
      )
      expect(mockRedisClient.destroy).toHaveBeenCalled()
    })

    it("should handle errors during Redis client disconnect", async () => {
      await socketManager.setIO(mockHttpServer)

      const disconnectError = new Error("Disconnect failed")
      mockRedisClient.destroy.mockRejectedValueOnce(disconnectError)

      await socketManager.cleanup()

      expect(Logger.error).toHaveBeenCalledWith(
        "Error disconnecting Redis client",
        expect.objectContaining({
          error: disconnectError,
        }),
      )
    })

    it("should do nothing if not initialized", async () => {
      await socketManager.cleanup()

      expect(mockRedisClient.destroy).not.toHaveBeenCalled()
    })
  })
})
