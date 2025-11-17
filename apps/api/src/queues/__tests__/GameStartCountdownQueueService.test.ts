import { type Game } from "@skymo/core"
import { Job } from "bullmq"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  type GameStartCountdownJobData,
  GameStartCountdownQueueService,
} from "../GameStartCountdownQueueService.js"

// Mock dependencies
vi.mock("bullmq", async () => {
  const actual = await vi.importActual("bullmq")
  return {
    ...actual,
    Queue: vi.fn().mockImplementation(() => ({
      add: vi.fn().mockResolvedValue({
        id: "test-job-id",
        timestamp: Date.now(),
        data: {},
        opts: {},
      }),
      remove: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      drain: vi.fn().mockResolvedValue(undefined),
      getJob: vi.fn().mockResolvedValue(null),
      on: vi.fn(),
    })),
    Worker: vi.fn().mockImplementation(() => ({
      on: vi.fn().mockReturnThis(),
      close: vi.fn().mockResolvedValue(undefined),
    })),
  }
})

vi.mock("@/redis/game.repository.js", () => ({
  GameRepository: vi.fn().mockImplementation(() => ({
    getGame: vi.fn(),
    updateGame: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock("@/realtime/utils/SocketManager.js", () => ({
  SocketManager: {
    getInstance: vi.fn().mockReturnValue({
      sendToRoom: vi.fn(),
      sendToSocket: vi.fn(),
    }),
  },
}))

vi.mock("@/realtime/utils/GameOperationManager.js", () => ({
  GameOperationManager: {
    getInstance: vi.fn().mockReturnValue({
      updateGame: vi.fn().mockResolvedValue(undefined),
    }),
  },
}))

vi.mock("@/realtime/utils/GameStateTracker.js", () => ({
  GameStateTracker: vi.fn().mockImplementation(() => ({
    getChanges: vi.fn().mockReturnValue({ test: "operations" }),
  })),
}))

vi.mock("@skymo/logger", () => ({
  Logger: {
    info: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

vi.mock("@/services/analytics/game.analytics.js", () => ({
  trackAnalyticsGameStarted: vi.fn().mockResolvedValue(undefined),
}))

// Mock environment
vi.mock("@env", () => ({
  ENV: {
    REDIS_URL: "redis://mock-redis-url",
  },
}))

describe("GameStartCountdownQueueService", () => {
  let countdownService: GameStartCountdownQueueService
  let mockGame: Game
  let mockJob: Job<GameStartCountdownJobData>

  beforeEach(() => {
    // Reset singleton instance for testing
    // @ts-ignore - Accessing private property for testing
    GameStartCountdownQueueService.instance = null

    // Get fresh instance
    countdownService = GameStartCountdownQueueService.getInstance()

    // Mock game
    mockGame = {
      code: "test-game",
      hostId: "host-123",
      start: vi.fn().mockResolvedValue(undefined),
      setOperationManager: vi.fn(),
      getPlayerById: vi.fn().mockReturnValue({
        id: "host-123",
        name: "Test Player",
        userId: 1,
      }),
      getConnectedPlayers: vi.fn().mockReturnValue([
        {
          id: "host-123",
          name: "Test Player",
          userId: 1,
        },
        {
          id: "player-456",
          name: "Guest Player",
          userId: undefined,
        },
      ]),
      settings: {
        private: false,
        maxPlayers: 8,
      },
    } as unknown as Game

    // Mock job
    mockJob = {
      data: {
        gameCode: "test-game",
        endTimestamp: Date.now() + 5000,
      },
      id: "job-123",
      attemptsMade: 0,
      opts: { attempts: 3 },
      moveToFailed: vi.fn(),
      token: "test-token",
    } as unknown as Job<GameStartCountdownJobData>

    // Setup mock returns
    const mockGameRepository = countdownService["gameRepository"]
    mockGameRepository.getGame = vi.fn().mockResolvedValue(mockGame)

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await countdownService.cleanup()
  })

  describe("Singleton pattern", () => {
    it("should return the same instance when getInstance is called multiple times", () => {
      const instance1 = GameStartCountdownQueueService.getInstance()
      const instance2 = GameStartCountdownQueueService.getInstance()

      expect(instance1).toBe(instance2)
    })

    it("should return true if instance exists", () => {
      expect(GameStartCountdownQueueService.exists()).toBe(true)
    })

    it("should return false if instance doesn't exist", () => {
      // @ts-ignore - Accessing private property for testing
      GameStartCountdownQueueService.instance = null

      expect(GameStartCountdownQueueService.exists()).toBe(false)
    })
  })

  describe("startCountdown", () => {
    it("should cancel any existing countdown first", async () => {
      const cancelSpy = vi.spyOn(countdownService, "cancelCountdown")

      await countdownService.startCountdown("test-game")

      expect(cancelSpy).toHaveBeenCalledWith("test-game")
    })

    it("should send a countdown-started event to the room", async () => {
      const socketManager = countdownService["socketManager"]

      await countdownService.startCountdown("test-game")

      expect(socketManager.sendToRoom).toHaveBeenCalledWith({
        room: "test-game",
        event: "game:countdown-started",
        data: [expect.any(Number)],
      })
    })

    it("should add a job to the queue with correct parameters", async () => {
      const queueAddSpy = vi.spyOn(countdownService["queue"], "add")
      const countdownMs = countdownService["COUNTDOWN_MS"]

      await countdownService.startCountdown("test-game")

      expect(queueAddSpy).toHaveBeenCalledWith(
        "game-start-countdown-test-game",
        {
          gameCode: "test-game",
          endTimestamp: expect.any(Number),
        },
        {
          delay: countdownMs,
          jobId: "game-start-countdown-test-game",
        },
      )
    })

    it("should set the endTimestamp to current time plus countdown duration", async () => {
      const now = Date.now()
      const dateSpy = vi.spyOn(Date, "now").mockReturnValue(now)
      const countdownMs = countdownService["COUNTDOWN_MS"]
      const expectedEndTimestamp = now + countdownMs

      await countdownService.startCountdown("test-game")

      const socketManager = countdownService["socketManager"]
      expect(socketManager.sendToRoom).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [expectedEndTimestamp],
        }),
      )

      dateSpy.mockRestore()
    })
  })

  describe("cancelCountdown", () => {
    it("should remove the job with the correct jobId", async () => {
      const queueRemoveSpy = vi.spyOn(countdownService["queue"], "remove")

      await countdownService.cancelCountdown("test-game")

      expect(queueRemoveSpy).toHaveBeenCalledWith(
        "game-start-countdown-test-game",
      )
    })

    it("should send a countdown-canceled event to the room", async () => {
      const socketManager = countdownService["socketManager"]

      await countdownService.cancelCountdown("test-game")

      expect(socketManager.sendToRoom).toHaveBeenCalledWith({
        room: "test-game",
        event: "game:countdown-canceled",
        data: [],
      })
    })
  })

  describe("processJob", () => {
    it("should get the game using gameRepository", async () => {
      const getGameSpy = vi.spyOn(countdownService["gameRepository"], "getGame")

      await countdownService["processJob"](mockJob)

      expect(getGameSpy).toHaveBeenCalledWith("test-game")
    })

    it("should set the game operation manager", async () => {
      await countdownService["processJob"](mockJob)

      expect(mockGame.setOperationManager).toHaveBeenCalled()
    })

    it("should start the game", async () => {
      await countdownService["processJob"](mockJob)

      expect(mockGame.start).toHaveBeenCalled()
    })

    it("should update the game with operations if changes exist", async () => {
      const updateGameSpy = vi.spyOn(
        countdownService["gameRepository"],
        "updateGame",
      )

      await countdownService["processJob"](mockJob)

      expect(updateGameSpy).toHaveBeenCalledWith(mockGame, {
        test: "operations",
      })
    })

    it("should send game update event with operations to the room", async () => {
      const socketManager = countdownService["socketManager"]

      await countdownService["processJob"](mockJob)

      expect(socketManager.sendToRoom).toHaveBeenCalledWith({
        room: "test-game",
        event: "game:update",
        data: [{ test: "operations" }],
      })
    })
  })

  describe("getGame", () => {
    it("should get game from repository and set operation manager", async () => {
      const getGameSpy = vi.spyOn(countdownService["gameRepository"], "getGame")

      await countdownService["getGame"]("test-game")

      expect(getGameSpy).toHaveBeenCalledWith("test-game")
      expect(mockGame.setOperationManager).toHaveBeenCalled()
    })
  })
})
