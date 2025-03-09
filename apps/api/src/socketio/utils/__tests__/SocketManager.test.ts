import { Server as HttpServer } from "http"
import { SocketManager } from "@/socketio/utils/SocketManager.js"
import { Constants as ErrorConstants } from "@skyjo/error"
import { mockSocket } from "@tests/_mock.js"
import { Server } from "socket.io"
import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("socket.io", () => {
  const mockSocket = vi.fn().mockReturnValue({
    emit: vi.fn(),
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
      connect: vi.fn(),
    }),
    connect: vi.fn(),
  })),
}))

describe("SocketManager", () => {
  let socketManager: SocketManager
  let httpServer: HttpServer

  beforeEach(() => {
    vi.clearAllMocks()
    socketManager = SocketManager.getInstance()

    // @ts-expect-error - Accessing private property for testing
    socketManager.io = null
    httpServer = {} as HttpServer
  })

  it("should be a singleton", () => {
    const instance1 = SocketManager.getInstance()
    const instance2 = SocketManager.getInstance()

    expect(instance1).toBe(instance2)
  })

  describe("setIO", () => {
    it("should initialize the io instance", () => {
      socketManager.setIO(httpServer)
      expect(Server).toHaveBeenCalledTimes(1)

      // @ts-expect-error - Accessing private property for testing
      expect(socketManager.io).toBeDefined()
    })

    it("should not initialize io if already initialized", () => {
      socketManager.setIO(httpServer)

      socketManager.setIO(httpServer)
      expect(Server).toHaveBeenCalledTimes(1)
    })
  })

  describe("getIO", () => {
    it("should throw an error if io is not initialized", () => {
      expect(() => socketManager.getIO()).toThrow(
        "Socket.IO server not initialized",
      )
    })

    it("should return the io instance if initialized", () => {
      socketManager.setIO(httpServer)

      expect(socketManager.getIO()).toBeDefined()
    })
  })

  describe("isInitialized", () => {
    it("should return false if io is not initialized", () => {
      expect(socketManager.isInitialized()).toBe(false)
    })

    it("should return true if io is initialized", () => {
      socketManager.setIO(httpServer)

      expect(socketManager.isInitialized()).toBe(true)
    })
  })

  describe("getSocket", () => {
    it("should return undefined if socket is not found", () => {
      socketManager.setIO(httpServer)
      expect(socketManager.getSocket("non-existent-id")).toBeUndefined()
    })

    it("should return the socket if found", () => {
      socketManager.setIO(httpServer)
      const socket = socketManager.getSocket("test-socket-id")
      expect(socket).toBeDefined()
    })
  })

  describe("sendToSocket", () => {
    it("should emit an event to the socket", () => {
      socketManager.setIO(httpServer)
      const socket = mockSocket()

      socketManager.sendToSocket(socket, {
        event: "error:reconnect",
        data: [ErrorConstants.ERROR.CANNOT_RECONNECT],
      })

      expect(socket.emit).toHaveBeenCalledWith(
        "error:reconnect",
        ErrorConstants.ERROR.CANNOT_RECONNECT,
      )
    })
  })

  describe("sendToRoom", () => {
    it("should emit an event to a room", () => {
      socketManager.setIO(httpServer)

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
    it("should emit a game event to a socket", () => {
      socketManager.setIO(httpServer)
      const mockGame = {
        toJson: vi.fn().mockReturnValue({ id: "game-id" }),
      }

      socketManager.sendGameToSocket("test-socket-id", mockGame as any)

      const io = socketManager.getIO()
      expect(io.to).toHaveBeenCalledWith("test-socket-id")
    })
  })
})
