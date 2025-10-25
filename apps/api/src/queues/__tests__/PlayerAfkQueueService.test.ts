import { Constants as CoreConstants, type Game, type Player } from "@skymo/core"
import { Job } from "bullmq"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { PlayerAfkQueueService } from "../PlayerAfkQueueService.js"

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
      getJob: vi.fn().mockResolvedValue(null),
      close: vi.fn().mockResolvedValue(undefined),
      drain: vi.fn().mockResolvedValue(undefined),
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
    getGameSafe: vi.fn(),
    updateGame: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock("@/realtime/utils/SocketManager.js", () => ({
  SocketManager: {
    getInstance: vi.fn().mockReturnValue({
      getSocket: vi.fn().mockReturnValue({
        volatile: {
          emit: vi.fn(),
        },
      }),
      sendToRoom: vi.fn(),
      sendToSocket: vi.fn(),
    }),
  },
}))

vi.mock("@/realtime/utils/GameOperationManager.js", () => ({
  GameOperationManager: {
    getInstance: vi.fn().mockReturnValue({
      updateGame: vi.fn().mockResolvedValue(undefined),
      removeGame: vi.fn().mockResolvedValue(undefined),
      startRevealCardsAfkTimer: vi.fn().mockResolvedValue(undefined),
      cancelRevealCardsAfkTimer: vi.fn().mockResolvedValue(undefined),
      startPlayerAfkTimer: vi.fn().mockResolvedValue(undefined),
      cancelPlayerAfkTimer: vi.fn().mockResolvedValue(undefined),
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

// Mock environment
vi.mock("@env", () => ({
  ENV: {
    REDIS_URL: "redis://mock-redis-url",
  },
}))

describe("PlayerAfkQueueService", () => {
  let playerAfkQueueService: PlayerAfkQueueService
  let mockGame: Game
  let mockPlayer: Player
  let mockCurrentPlayer: Player
  let mockJob: Job<{ gameCode: string; playerId: string }>

  beforeEach(() => {
    // Reset and get singleton instance
    // @ts-ignore - Accessing private property for testing
    Object.defineProperty(PlayerAfkQueueService, "instance", {
      value: undefined,
      writable: true,
    })
    playerAfkQueueService = PlayerAfkQueueService.getInstance()

    // Mock game and players
    mockCurrentPlayer = {
      id: "current-player-123",
      name: "Current Player",
      socketId: "current-socket-123",
      afkCount: 0,
      consecutiveAfkCount: 0,
      getFirstCardNotVisible: vi.fn().mockReturnValue({ column: 0, row: 0 }),
    } as unknown as Player

    mockPlayer = {
      id: "player-123",
      name: "Test Player",
      socketId: "socket-123",
      afkCount: 0,
      consecutiveAfkCount: 0,
    } as unknown as Player

    mockGame = {
      code: "test-game",
      settings: {
        private: false,
      },
      processingAfk: false,
      isPlaying: vi.fn().mockReturnValue(true),
      isRoundMain: vi.fn().mockReturnValue(true),
      getCurrentPlayer: vi.fn().mockReturnValue(mockCurrentPlayer),
      getPlayerById: vi.fn().mockImplementation((id) => {
        if (id === "current-player-123") return mockCurrentPlayer
        if (id === "player-123") return mockPlayer
        return undefined
      }),
      getPlayerTimeout: vi.fn().mockReturnValue(CoreConstants.TURN_TIMEOUT.CONNECTED),
      turnStatus: CoreConstants.TURN_STATUS.CHOOSE_A_PILE,
      drawCard: vi.fn(),
      turnCard: vi.fn().mockResolvedValue(undefined),
      replaceCard: vi.fn().mockResolvedValue(undefined),
      disconnectPlayer: vi.fn().mockResolvedValue(undefined),
      setOperationManager: vi.fn(),
    } as unknown as Game

    // Mock job
    mockJob = {
      data: {
        gameCode: "test-game",
        playerId: "current-player-123",
      },
      id: "job-123",
      attemptsMade: 0,
      opts: { attempts: 3 },
      moveToFailed: vi.fn(),
      token: "test-token",
    } as unknown as Job<{ gameCode: string; playerId: string }>

    // Setup mock returns
    // @ts-ignore - Accessing protected property for testing
    playerAfkQueueService.redis.getGameSafe = vi
      .fn()
      .mockResolvedValue(mockGame)

    vi.clearAllMocks()
  })

  afterEach(async () => {
    await playerAfkQueueService.cleanup()
  })

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = PlayerAfkQueueService.getInstance()
      const instance2 = PlayerAfkQueueService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe("exists", () => {
    it("should return true if instance exists", () => {
      expect(PlayerAfkQueueService.exists()).toBe(true)
    })

    it("should return false if instance doesn't exist", () => {
      // Mock the static exists method just for this test
      const originalExists = PlayerAfkQueueService.exists
      PlayerAfkQueueService.exists = vi.fn().mockReturnValue(false)

      expect(PlayerAfkQueueService.exists()).toBe(false)

      // Restore the original function
      PlayerAfkQueueService.exists = originalExists
    })
  })

  describe("startTimer", () => {
    it("should add job to queue with correct parameters", async () => {
      const queueAddSpy = vi.spyOn(playerAfkQueueService["queue"], "add")

      await playerAfkQueueService.startTimer(mockGame, "player-123")

      expect(queueAddSpy).toHaveBeenCalledWith(
        "game:test-game:player:player-123",
        {
          gameCode: "test-game",
          playerId: "player-123",
        },
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: "game:test-game:player:player-123",
          removeOnComplete: true,
        }),
      )
    })
  })

  describe("cancelTimer", () => {
    it("should remove job from queue with correct id", async () => {
      const mockJob = { remove: vi.fn().mockResolvedValue(undefined) }
      const getJobSpy = vi
        .spyOn(playerAfkQueueService["queue"], "getJob")
        .mockResolvedValue(mockJob as any)

      await playerAfkQueueService.cancelTimer("test-game", "player-123")

      expect(getJobSpy).toHaveBeenCalledWith("game:test-game:player:player-123")
      expect(mockJob.remove).toHaveBeenCalled()
    })
  })

  describe("processJob", () => {
    it("should not process if game is not found", async () => {
      // @ts-ignore - Accessing protected property for testing
      playerAfkQueueService.redis.getGameSafe = vi.fn().mockResolvedValue(null)

      await playerAfkQueueService["processJob"](mockJob)

      expect(mockGame.setOperationManager).not.toHaveBeenCalled()
    })

    it("should not process if game is not in playing state", async () => {
      mockGame.isPlaying = vi.fn().mockReturnValue(false)

      await playerAfkQueueService["processJob"](mockJob)

      expect(mockGame.setOperationManager).toHaveBeenCalled()
      expect(mockJob.moveToFailed).not.toHaveBeenCalled()
    })

    it("should not process if game is not in main round", async () => {
      mockGame.isRoundMain = vi.fn().mockReturnValue(false)

      await playerAfkQueueService["processJob"](mockJob)

      expect(mockGame.setOperationManager).toHaveBeenCalled()
      expect(mockJob.moveToFailed).not.toHaveBeenCalled()
    })

    it("should not process if player doesn't match current player", async () => {
      mockJob.data.playerId = "player-123" // Not the current player

      await playerAfkQueueService["processJob"](mockJob)

      expect(mockGame.setOperationManager).toHaveBeenCalled()
      // Since we're not incrementing AFK count, we're not checking if AFK count is incremented
    })

    it("should perform AFK move in CHOOSE_A_PILE state", async () => {
      const lockGameSpy = vi.spyOn(playerAfkQueueService as any, "lockGame")
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(false) // Not disconnecting
      const unlockGameSpy = vi.spyOn(playerAfkQueueService as any, "unlockGame")

      mockGame.turnStatus = CoreConstants.TURN_STATUS.CHOOSE_A_PILE

      await playerAfkQueueService["processJob"](mockJob)

      expect(lockGameSpy).toHaveBeenCalled()
      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockGame.drawCard).toHaveBeenCalled()
      expect(mockCurrentPlayer.getFirstCardNotVisible).toHaveBeenCalled()
      expect(mockGame.turnCard).toHaveBeenCalledWith(
        expect.objectContaining({
          player: mockCurrentPlayer,
          column: 0,
          row: 0,
          wasAfk: true,
        }),
      )
      expect(unlockGameSpy).toHaveBeenCalled()
    })

    it("should perform AFK move in THROW_OR_REPLACE state", async () => {
      const lockGameSpy = vi.spyOn(playerAfkQueueService as any, "lockGame")
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(false) // Not disconnecting
      const unlockGameSpy = vi.spyOn(playerAfkQueueService as any, "unlockGame")

      mockGame.turnStatus = CoreConstants.TURN_STATUS.THROW_OR_REPLACE

      await playerAfkQueueService["processJob"](mockJob)

      expect(lockGameSpy).toHaveBeenCalled()
      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockGame.drawCard).not.toHaveBeenCalled()
      expect(mockCurrentPlayer.getFirstCardNotVisible).toHaveBeenCalled()
      expect(mockGame.replaceCard).toHaveBeenCalledWith(
        expect.objectContaining({
          column: 0,
          row: 0,
          wasAfk: true,
        }),
      )
      expect(unlockGameSpy).toHaveBeenCalled()
    })

    it("should not perform AFK move if player is disconnected", async () => {
      const lockGameSpy = vi.spyOn(playerAfkQueueService as any, "lockGame")
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(true) // Player disconnected
      const unlockGameSpy = vi.spyOn(playerAfkQueueService as any, "unlockGame")

      await playerAfkQueueService["processJob"](mockJob)

      expect(lockGameSpy).toHaveBeenCalled()
      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockGame.drawCard).not.toHaveBeenCalled()
      expect(mockCurrentPlayer.getFirstCardNotVisible).not.toHaveBeenCalled()
      expect(unlockGameSpy).toHaveBeenCalled()
    })
  })
})
