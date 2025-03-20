import { Server as HttpServer } from "http"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import { Constants as ErrorConstants } from "@skymo/error"
import { mockSocket } from "@tests/_mock.js"
import { Server } from "socket.io"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Mock sockets for fetchSockets
const mockSockets = [
  { id: "socket1", disconnect: vi.fn() },
  { id: "socket2", disconnect: vi.fn() },
]

// Create a proper mock for fetchSockets
const mockFetchSockets = vi.fn().mockResolvedValue(mockSockets)

vi.mock("socket.io", () => {
  const mockSocket = vi.fn().mockReturnValue({
    emit: vi.fn(),
    disconnect: vi.fn(),
  })

  const mockTo = vi.fn().mockReturnValue({
    emit: vi.fn(),
  })

  return {
    Server: vi.fn().mockImplementation(() => ({
      to: mockTo,
      sockets: {
        sockets: new Map([["test-socket-id", mockSocket()]]),
      },
      engine: {
        on: vi.fn(),
      },
      on: vi.fn(),
      fetchSockets: mockFetchSockets,
      close: vi.fn((cb) => cb()),
      disconnectSockets: vi.fn(),
    })),
  }
})

vi.mock("@socket.io/redis-adapter", () => ({
  createAdapter: vi.fn(),
}))

vi.mock("redis", () => ({
  createClient: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    duplicate: vi.fn().mockReturnValue({
      on: vi.fn(),
      connect: vi.fn().mockResolvedValue(undefined),
      disconnect: vi.fn().mockResolvedValue(undefined),
    }),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
  })),
}))

describe("SocketManager", () => {
  let socketManager: SocketManager
  let httpServer: HttpServer

  beforeEach(() => {
    vi.clearAllMocks()
    socketManager = SocketManager.getInstance()

    // Reset the internal state of SocketManager
    // @ts-expect-error - Accessing private property for testing
    socketManager.io = null
    // @ts-expect-error - Accessing private property for testing
    socketManager.initialized = false
    // @ts-expect-error - Accessing private property for testing
    socketManager.pubClient = null
    // @ts-expect-error - Accessing private property for testing
    socketManager.subClient = null

    httpServer = {} as HttpServer
  })

  it("should be a singleton", () => {
    const instance1 = SocketManager.getInstance()
    const instance2 = SocketManager.getInstance()

    expect(instance1).toBe(instance2)
  })

  describe("setIO", () => {
    it("should initialize the io instance", async () => {
      await socketManager.setIO(httpServer)
      expect(Server).toHaveBeenCalledTimes(1)

      // @ts-expect-error - Accessing private property for testing
      expect(socketManager.io).toBeDefined()
      expect(socketManager.isInitialized()).toBe(true)
    })

    it("should not initialize io if already initialized", async () => {
      await socketManager.setIO(httpServer)
      // @ts-expect-error - Accessing private property for testing
      const originalIO = socketManager.io

      await socketManager.setIO(httpServer)
      expect(Server).toHaveBeenCalledTimes(1)
      // @ts-expect-error - Accessing private property for testing
      expect(socketManager.io).toBe(originalIO)
    })
  })

  describe("getIO", () => {
    it("should throw an error if io is not initialized", () => {
      expect(() => socketManager.getIO()).toThrow(
        "Socket.IO server not initialized",
      )
    })

    it("should return the io instance if initialized", async () => {
      await socketManager.setIO(httpServer)

      expect(socketManager.getIO()).toBeDefined()
    })
  })

  describe("isInitialized", () => {
    it("should return false if io is not initialized", () => {
      // Explicitly set initialized to false
      // @ts-expect-error - Accessing private property for testing
      socketManager.initialized = false
      expect(socketManager.isInitialized()).toBe(false)
    })

    it("should return true if io is initialized", async () => {
      await socketManager.setIO(httpServer)

      expect(socketManager.isInitialized()).toBe(true)
    })
  })

  describe("getSocket", () => {
    it("should return undefined if socket is not found", async () => {
      await socketManager.setIO(httpServer)
      expect(socketManager.getSocket("non-existent-id")).toBeUndefined()
    })

    it("should return the socket if found", async () => {
      await socketManager.setIO(httpServer)
      const socket = socketManager.getSocket("test-socket-id")
      expect(socket).toBeDefined()
    })
  })

  describe("sendToSocket", () => {
    it("should emit an event to the socket", () => {
      const socket = mockSocket()
      socket.connected = true

      socketManager.sendToSocket(socket, {
        event: "error:reconnect",
        data: [ErrorConstants.ERROR.CANNOT_RECONNECT],
      })

      expect(socket.emit).toHaveBeenCalledWith(
        "error:reconnect",
        ErrorConstants.ERROR.CANNOT_RECONNECT,
      )
    })

    it("should not emit if socket is disconnected", () => {
      const socket = mockSocket()
      socket.connected = false

      socketManager.sendToSocket(socket, {
        event: "error:reconnect",
        data: [ErrorConstants.ERROR.CANNOT_RECONNECT],
      })

      expect(socket.emit).not.toHaveBeenCalled()
    })
  })

  describe("sendToRoom", () => {
    it("should emit an event to a room", async () => {
      await socketManager.setIO(httpServer)

      socketManager.sendToRoom({
        room: "TEST123",
        event: "error:join",
        data: [ErrorConstants.ERROR.GAME_NOT_FOUND],
      })

      const io = socketManager.getIO()
      expect(io.to).toHaveBeenCalledWith("TEST123")
    })
  })

  describe("sendGameToSocket", () => {
    it("should emit a game event to a socket", async () => {
      await socketManager.setIO(httpServer)
      const mockGame = {
        toJson: vi.fn().mockReturnValue({ id: "game-id" }),
      }

      socketManager.sendGameToSocket("test-socket-id", mockGame as any)

      const io = socketManager.getIO()
      expect(io.to).toHaveBeenCalledWith("test-socket-id")
    })
  })

  describe("cleanup", () => {
    it("should clean up all resources", async () => {
      await socketManager.setIO(httpServer)

      // @ts-expect-error - Accessing private property for testing
      const ioMock = socketManager.io
      // @ts-expect-error - Accessing private property for testing
      const pubClientMock = socketManager.pubClient
      // @ts-expect-error - Accessing private property for testing
      const subClientMock = socketManager.subClient

      // Add non-null assertions to fix TypeScript errors
      expect(ioMock).not.toBeNull()
      expect(pubClientMock).not.toBeNull()
      expect(subClientMock).not.toBeNull()

      // Reset mock function calls
      mockFetchSockets.mockClear()

      await socketManager.cleanup()

      // Verify fetchSockets was called
      expect(mockFetchSockets).toHaveBeenCalled()

      // Check socket.io server cleanup
      expect(ioMock!.disconnectSockets).toHaveBeenCalledWith(true)
      expect(ioMock!.close).toHaveBeenCalled()

      // Check Redis clients cleanup
      expect(pubClientMock!.disconnect).toHaveBeenCalled()
      expect(subClientMock!.disconnect).toHaveBeenCalled()

      // Check properties are reset
      // @ts-expect-error - Accessing private property for testing
      expect(socketManager.io).toBeNull()
      // @ts-expect-error - Accessing private property for testing
      expect(socketManager.pubClient).toBeNull()
      // @ts-expect-error - Accessing private property for testing
      expect(socketManager.subClient).toBeNull()
      expect(socketManager.isInitialized()).toBe(false)
    })
  })
})
