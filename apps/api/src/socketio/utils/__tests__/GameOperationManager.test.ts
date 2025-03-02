import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GameOperationManager } from "../GameOperationManager.js"
import { GameStateTracker } from "../GameStateTracker.js"

// Mock dependencies
vi.mock("@/redis/game.repository.js", () => ({
  GameRepository: vi.fn().mockImplementation(() => ({
    removeGame: vi.fn().mockResolvedValue(undefined),
    updateGame: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock("@/queues/PlayerAfkQueueService.js", () => ({
  PlayerAfkQueueService: {
    getInstance: vi.fn().mockReturnValue({
      startTimer: vi.fn().mockResolvedValue(undefined),
      cancelTimer: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

vi.mock("@/queues/RevealCardsAfkQueueService.js", () => ({
  RevealCardsAfkQueueService: {
    getInstance: vi.fn().mockReturnValue({
      startTimer: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

vi.mock("@/socketio/utils/SocketManager.js", () => ({
  SocketManager: {
    getInstance: vi.fn().mockReturnValue({
      getSocket: vi.fn().mockReturnValue({ id: "socket-id" }),
      sendToRoom: vi.fn(),
    }),
  },
}))

vi.mock("../GameStateTracker.js", () => ({
  GameStateTracker: vi.fn().mockImplementation(() => ({
    getChanges: vi.fn().mockReturnValue({ changes: "test" }),
    previousState: {} as any,
    game: {} as any,
  })),
}))

describe("GameOperationManager", () => {
  let gameOperationManager: GameOperationManager

  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error Accessing private static property for testing
    GameOperationManager.instance = undefined
    gameOperationManager = GameOperationManager.getInstance()

    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("should be a singleton", () => {
    const instance1 = GameOperationManager.getInstance()
    const instance2 = GameOperationManager.getInstance()

    expect(instance1).toBe(instance2)
  })

  describe("removeGame", () => {
    it("should call redis.removeGame with the game code", async () => {
      await gameOperationManager.removeGame("TEST123")
      expect(gameOperationManager["redis"]?.removeGame).toHaveBeenCalledWith(
        "TEST123",
      )
    })
  })

  describe("updateGame", () => {
    it("should call redis.updateGame with the game", async () => {
      const mockGame = { id: "game-id" } as any
      await gameOperationManager.updateGame(mockGame)
      expect(gameOperationManager["redis"]?.updateGame).toHaveBeenCalledWith(
        mockGame,
      )
    })
  })

  describe("getSocket", () => {
    it("should call socketManager.getSocket with the socket id", () => {
      const result = gameOperationManager.getSocket("test-socket-id")
      expect(
        gameOperationManager["socketManager"]?.getSocket,
      ).toHaveBeenCalledWith("test-socket-id")
      expect(result).toBeDefined()
    })
  })

  describe("kickSocket", () => {
    it("should call socket.leave with the game code", async () => {
      const mockSocket = {
        data: {
          gameCode: "TEST123",
        },
        leave: vi.fn(),
      } as any
      await gameOperationManager.kickSocket(mockSocket)
      expect(mockSocket.leave).toHaveBeenCalledWith("TEST123")
    })
  })

  describe("startRevealCardsAfkTimer", () => {
    it("should call revealCardsAfkQueue.startTimer with the game", async () => {
      const mockGame = { id: "game-id" } as any
      await gameOperationManager.startRevealCardsAfkTimer(mockGame)
      expect(
        gameOperationManager["revealCardsAfkQueue"]?.startTimer,
      ).toHaveBeenCalledWith(mockGame)
    })
  })

  describe("startPlayerAfkTimer", () => {
    it("should call playerAfkQueue.startTimer with the game and player id", async () => {
      const mockGame = { id: "game-id" } as any
      await gameOperationManager.startPlayerAfkTimer(mockGame, "player-id")
      expect(
        gameOperationManager["playerAfkQueue"]?.startTimer,
      ).toHaveBeenCalledWith(mockGame, "player-id")
    })
  })

  describe("cancelPlayerAfkTimer", () => {
    it("should call playerAfkQueue.cancelTimer with the game code and player id", async () => {
      await gameOperationManager.cancelPlayerAfkTimer("TEST123", "player-id")
      expect(
        gameOperationManager["playerAfkQueue"]?.cancelTimer,
      ).toHaveBeenCalledWith("TEST123", "player-id")
    })
  })

  describe("delayNewRound", () => {
    it("should call the callback after the delay and do nothing since they are no changes", async () => {
      // Create a mock instance with null changes for this test only
      const mockTrackerInstance = {
        getChanges: vi.fn().mockReturnValue(null)
      };
      
      // Mock the constructor to return our mock instance
      vi.mocked(GameStateTracker).mockImplementationOnce(() => 
        mockTrackerInstance as unknown as GameStateTracker
      );
      
      const mockGame = {
        code: "TEST123",
        id: "game-id",
      } as any;

      const callback = vi.fn().mockResolvedValue(undefined);

      gameOperationManager.delayNewRound(mockGame, callback, 1000);

      vi.advanceTimersByTime(1000);

      await vi.runAllTimersAsync();

      expect(callback).toHaveBeenCalledTimes(1);
      expect(GameStateTracker).toHaveBeenCalledWith(mockGame);
      expect(mockTrackerInstance.getChanges).toHaveBeenCalled();
      expect(gameOperationManager["redis"]?.updateGame).not.toHaveBeenCalled();
      expect(
        gameOperationManager["socketManager"]?.sendToRoom
      ).not.toHaveBeenCalled();
    });

    it("should call the callback after the delay and update the game", async () => {
      const mockGame = {
        code: "TEST123",
        id: "game-id",
      } as any

      const callback = vi.fn().mockResolvedValue(undefined)

      gameOperationManager.delayNewRound(mockGame, callback, 1000)

      // Fast-forward time
      vi.advanceTimersByTime(1000)

      // Wait for promises to resolve
      await vi.runAllTimersAsync()

      expect(callback).toHaveBeenCalledTimes(1)
      expect(GameStateTracker).toHaveBeenCalledWith(mockGame)
      expect(gameOperationManager["redis"]?.updateGame).toHaveBeenCalledWith(
        mockGame,
        { changes: "test" },
      )
      expect(
        gameOperationManager["socketManager"]?.sendToRoom,
      ).toHaveBeenCalledWith({
        room: "TEST123",
        event: "game:update",
        data: [{ changes: "test" }],
      })
    })
  })
})
