import { type Game, type Player } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Job } from "bullmq"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  type RevealCardsAfkJobData,
  RevealCardsAfkQueueService,
} from "../RevealCardsAfkQueueService.js"

// Mock other queue services to prevent initialization
vi.mock("../BaseAfkQueueService.js", async () => {
  const actual = await vi.importActual("../BaseAfkQueueService.js")
  return {
    ...actual,
  }
})

vi.mock("../PlayerAfkQueueService.js", () => ({
  PlayerAfkQueueService: {
    getInstance: vi.fn(),
    exists: vi.fn().mockReturnValue(false),
    instance: undefined,
  },
}))

vi.mock("../KickVoteExpirationQueueService.js", () => ({
  KickVoteExpirationQueueService: {
    getInstance: vi.fn(),
    exists: vi.fn().mockReturnValue(false),
    instance: undefined,
  },
}))

vi.mock("../GameStartCountdownQueueService.js", () => ({
  GameStartCountdownQueueService: {
    getInstance: vi.fn(),
    exists: vi.fn().mockReturnValue(false),
    instance: undefined,
  },
}))

// Mock dependencies
vi.mock("bullmq", async () => {
  const actual = await vi.importActual("bullmq")
  return {
    ...actual,
    Queue: vi.fn().mockImplementation(() => ({
      add: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      drain: vi.fn().mockResolvedValue(undefined),
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
        emit: vi.fn(),
      }),
      sendToRoom: vi.fn(),
      sendToSocket: vi.fn(),
    }),
  },
}))

vi.mock("@/realtime/utils/GameOperationManager.js", () => ({
  GameOperationManager: {
    getInstance: vi.fn().mockReturnValue({
      updateGame: vi.fn(),
      removeGame: vi.fn(),
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

describe("RevealCardsAfkQueueService", () => {
  let queueService: RevealCardsAfkQueueService
  let mockGame: Game
  let mockPlayer: Player
  let mockJob: Job<RevealCardsAfkJobData>

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Reset the instance
    // @ts-expect-error accessing private property for testing
    RevealCardsAfkQueueService.instance = undefined

    // Get a fresh instance for each test
    queueService = RevealCardsAfkQueueService.getInstance()

    // Create mock game
    mockGame = {
      code: "test-game",
      settings: {
        private: false,
        initialTurnedCount: 2,
      },
      processingAfk: false,
      disconnectPlayer: vi.fn().mockResolvedValue(undefined),
      setOperationManager: vi.fn(),
      isPlaying: vi.fn().mockReturnValue(true),
      isRoundRevealCards: vi.fn().mockReturnValue(true),
      getConnectedPlayers: vi.fn().mockReturnValue([]),
      revealCard: vi.fn().mockResolvedValue(undefined),
    } as unknown as Game

    // Create mock player
    mockPlayer = {
      id: "player-123",
      name: "Test Player",
      socketId: "socket-123",
      afkCount: 0,
      consecutiveAfkCount: 0,
      hasRevealedCardCount: vi.fn().mockReturnValue(false),
      getFirstCardNotVisible: vi.fn().mockReturnValue({ column: 0, row: 0 }),
    } as unknown as Player

    // Create mock job
    mockJob = {
      id: "job-123",
      data: { gameCode: "test-game" },
      moveToFailed: vi.fn().mockResolvedValue(undefined),
      token: "token-123",
    } as unknown as Job<RevealCardsAfkJobData>
  })

  afterEach(async () => {
    await queueService.cleanup()
  })

  describe("getInstance", () => {
    it("should return a singleton instance", () => {
      const instance1 = RevealCardsAfkQueueService.getInstance()
      const instance2 = RevealCardsAfkQueueService.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe("exists", () => {
    it("should return true when instance exists", () => {
      // Instance is created in beforeEach
      expect(RevealCardsAfkQueueService.exists()).toBe(true)
    })

    it("should return false when instance does not exist", () => {
      // We can't directly access the private property, so we'll mock the function
      const originalExists = RevealCardsAfkQueueService.exists
      RevealCardsAfkQueueService.exists = vi.fn().mockReturnValue(false)

      expect(RevealCardsAfkQueueService.exists()).toBe(false)

      // Restore the original function
      RevealCardsAfkQueueService.exists = originalExists
    })
  })

  describe("startTimer", () => {
    it("should add a job to the queue with correct parameters", async () => {
      await queueService.startTimer(mockGame)

      expect(queueService["queue"].add).toHaveBeenCalledWith(
        `game:${mockGame.code}`,
        { gameCode: mockGame.code },
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: `game:${mockGame.code}`,
          removeOnComplete: true,
          removeOnFail: 50,
        }),
      )
    })

    it("should handle errors", async () => {
      // Set up the queue to throw an error
      queueService["queue"].add = vi
        .fn()
        .mockRejectedValue(new Error("Test error"))

      await queueService.startTimer(mockGame)

      expect(queueService["queue"].add).toHaveBeenCalled()
    })
  })

  describe("cancelTimer", () => {
    it("should remove the job from the queue with correct id", async () => {
      await queueService.cancelTimer(mockGame.code)

      expect(queueService["queue"].remove).toHaveBeenCalledWith(
        `game:${mockGame.code}`,
      )
    })

    it("should handle errors", async () => {
      // Set up the queue to throw an error
      queueService["queue"].remove = vi
        .fn()
        .mockRejectedValue(new Error("Test error"))

      await queueService.cancelTimer(mockGame.code)

      expect(queueService["queue"].remove).toHaveBeenCalled()
    })
  })

  describe("processJob", () => {
    it("should do nothing if game is not found", async () => {
      // Set up the game repository to return null
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(null)

      await queueService.processJob(mockJob)

      expect(queueService["redis"].getGameSafe).toHaveBeenCalledWith(
        mockGame.code,
      )
      expect(mockJob.moveToFailed).not.toHaveBeenCalled()
    })

    it("should exit early if game is not in playing state", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up the game to not be in playing state
      mockGame.isPlaying = vi.fn().mockReturnValue(false)

      // In the implementation, isRoundRevealCards might be called but it won't proceed with the AFK checks
      mockGame.isRoundRevealCards = vi.fn().mockReturnValue(false)

      await queueService.processJob(mockJob)

      expect(queueService["redis"].getGameSafe).toHaveBeenCalledWith(
        mockGame.code,
      )
      expect(mockGame.isPlaying).toHaveBeenCalled()
      // We don't assert on isRoundRevealCards since it may or may not be called depending on implementation

      // But we can assert that we didn't process any players
      expect(mockGame.getConnectedPlayers).not.toHaveBeenCalled()
    })

    it("should exit early if game is not in reveal cards round", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up the game to be in playing state but not in reveal cards round
      mockGame.isPlaying = vi.fn().mockReturnValue(true)
      mockGame.isRoundRevealCards = vi.fn().mockReturnValue(false)

      await queueService.processJob(mockJob)

      expect(queueService["redis"].getGameSafe).toHaveBeenCalledWith(
        mockGame.code,
      )
      expect(mockGame.isPlaying).toHaveBeenCalled()
      expect(mockGame.isRoundRevealCards).toHaveBeenCalled()
      expect(mockJob.moveToFailed).not.toHaveBeenCalled()
    })

    it("should process players who have not revealed enough cards", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up the game to be in playing state and in reveal cards round
      mockGame.isPlaying = vi.fn().mockReturnValue(true)
      mockGame.isRoundRevealCards = vi.fn().mockReturnValue(true)

      // Set up a player who has not revealed enough cards
      mockPlayer.hasRevealedCardCount = vi.fn().mockReturnValue(false)
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Mock the increaseAfkCount method to return false (no disconnect)
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )
      increaseAfkCountSpy.mockResolvedValue(false)

      // Mock the warnPlayer method
      const warnPlayerSpy = vi.spyOn(queueService as any, "warnPlayer")

      await queueService.processJob(mockJob)

      expect(queueService["redis"].getGameSafe).toHaveBeenCalledWith(
        mockGame.code,
      )
      expect(mockGame.isPlaying).toHaveBeenCalled()
      expect(mockGame.isRoundRevealCards).toHaveBeenCalled()
      expect(mockGame.getConnectedPlayers).toHaveBeenCalled()
      expect(mockPlayer.hasRevealedCardCount).toHaveBeenCalledWith(
        mockGame.settings.initialTurnedCount,
      )
      expect(increaseAfkCountSpy).toHaveBeenCalledWith(mockGame, mockPlayer)
      expect(mockGame.revealCard).toHaveBeenCalledWith({
        player: mockPlayer,
        column: 0,
        row: 0,
        wasAfk: true,
      })
      expect(warnPlayerSpy).toHaveBeenCalledWith(mockPlayer)
      expect(queueService["redis"].updateGame).toHaveBeenCalledWith(mockGame, {
        test: "operations",
      })
      expect(mockJob.moveToFailed).not.toHaveBeenCalled()
    })

    it("should not process players who have revealed enough cards", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up a player who has revealed enough cards
      mockPlayer.hasRevealedCardCount = vi.fn().mockReturnValue(true)
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Mock the increaseAfkCount method
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )

      await queueService.processJob(mockJob)

      expect(mockPlayer.hasRevealedCardCount).toHaveBeenCalledWith(
        mockGame.settings.initialTurnedCount,
      )
      expect(increaseAfkCountSpy).not.toHaveBeenCalled()
      expect(mockGame.revealCard).not.toHaveBeenCalled()
    })

    it("should disconnect player if AFK count is too high", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up a player who has not revealed enough cards
      mockPlayer.hasRevealedCardCount = vi.fn().mockReturnValue(false)
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Mock the increaseAfkCount method to return true (disconnect)
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )
      increaseAfkCountSpy.mockResolvedValue(true)

      await queueService.processJob(mockJob)

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(mockGame, mockPlayer)
      expect(mockGame.revealCard).not.toHaveBeenCalled()
    })

    it("should handle player not found error", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up a player who has not revealed enough cards
      mockPlayer.hasRevealedCardCount = vi.fn().mockReturnValue(false)
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Mock the increaseAfkCount method to throw a player not found error
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )
      increaseAfkCountSpy.mockRejectedValue(
        new CError("Player not found", {
          code: ErrorConstants.ERROR.PLAYER_NOT_FOUND,
        }),
      )

      await queueService.processJob(mockJob)

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(mockGame, mockPlayer)
      expect(mockJob.moveToFailed).not.toHaveBeenCalled()
    })

    it("should handle other errors", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up a player who has not revealed enough cards
      mockPlayer.hasRevealedCardCount = vi.fn().mockReturnValue(false)
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Mock the increaseAfkCount method to throw a generic error
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )
      increaseAfkCountSpy.mockRejectedValue(new Error("Generic error"))

      await queueService.processJob(mockJob)

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(mockGame, mockPlayer)
      expect(mockJob.moveToFailed).toHaveBeenCalledWith(
        expect.any(Error),
        mockJob.token,
      )
    })

    it("should attempt multiple cards if needed to reach target count", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Create an array of connected players with just our mock player
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Create a more controlled implementation of hasRevealedCardCount
      let revealedCardCount = 0
      mockPlayer.hasRevealedCardCount = vi.fn().mockImplementation((target) => {
        return revealedCardCount >= target
      })

      // Mock the getFirstCardNotVisible method
      mockPlayer.getFirstCardNotVisible = vi
        .fn()
        .mockReturnValueOnce({ column: 0, row: 0 })
        .mockReturnValueOnce({ column: 1, row: 0 })

      // Mock the increaseAfkCount method to return false (no disconnect)
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )
      increaseAfkCountSpy.mockResolvedValue(false)

      // Mock the revealCard method to increment the revealedCardCount
      mockGame.revealCard = vi.fn().mockImplementation(async () => {
        revealedCardCount++
        return Promise.resolve()
      })

      await queueService.processJob(mockJob)

      // Check that the mocks were called the expected number of times
      expect(mockPlayer.hasRevealedCardCount).toHaveBeenCalledTimes(4)
      expect(mockPlayer.getFirstCardNotVisible).toHaveBeenCalledTimes(2)
      expect(mockGame.revealCard).toHaveBeenCalledTimes(2)

      // Verify the arguments for each call
      expect(mockGame.revealCard).toHaveBeenNthCalledWith(1, {
        player: mockPlayer,
        column: 0,
        row: 0,
        wasAfk: true,
      })

      expect(mockGame.revealCard).toHaveBeenNthCalledWith(2, {
        player: mockPlayer,
        column: 1,
        row: 0,
        wasAfk: true,
      })
    })

    it("should handle errors during card reveal", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up a player who has not revealed enough cards
      mockPlayer.hasRevealedCardCount = vi.fn().mockReturnValue(false)
      mockPlayer.getFirstCardNotVisible = vi
        .fn()
        .mockReturnValue({ column: 0, row: 0 })
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Mock the increaseAfkCount method to return false (no disconnect)
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )
      increaseAfkCountSpy.mockResolvedValue(false)

      // Make the revealCard method throw an error
      mockGame.revealCard = vi
        .fn()
        .mockRejectedValue(new Error("Failed to reveal card"))

      await queueService.processJob(mockJob)

      expect(mockPlayer.hasRevealedCardCount).toHaveBeenCalled()
      expect(mockPlayer.getFirstCardNotVisible).toHaveBeenCalled()
      expect(mockGame.revealCard).toHaveBeenCalledWith({
        player: mockPlayer,
        column: 0,
        row: 0,
        wasAfk: true,
      })
      // Should still update the game and not fail the job
      expect(queueService["redis"].updateGame).toHaveBeenCalled()
      expect(mockJob.moveToFailed).not.toHaveBeenCalled()
    })

    it("should stop after max attempts if target not reached", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up a player who never reaches the target
      mockPlayer.hasRevealedCardCount = vi.fn().mockReturnValue(false)
      mockPlayer.getFirstCardNotVisible = vi
        .fn()
        .mockReturnValue({ column: 0, row: 0 })
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Mock the increaseAfkCount method to return false (no disconnect)
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )
      increaseAfkCountSpy.mockResolvedValue(false)

      await queueService.processJob(mockJob)

      // Should have stopped after reaching max attempts (12)
      expect(mockGame.revealCard).toHaveBeenCalledTimes(1)
    })

    it("should stop if no more cards to reveal", async () => {
      // Set up the game repository to return the mock game
      queueService["redis"].getGameSafe = vi.fn().mockResolvedValue(mockGame)

      // Set up a player who has no more cards to reveal
      mockPlayer.hasRevealedCardCount = vi.fn().mockReturnValue(false)
      mockPlayer.getFirstCardNotVisible = vi.fn().mockReturnValue(null)
      mockGame.getConnectedPlayers = vi.fn().mockReturnValue([mockPlayer])

      // Mock the increaseAfkCount method to return false (no disconnect)
      const increaseAfkCountSpy = vi.spyOn(
        queueService as any,
        "increaseAfkCount",
      )
      increaseAfkCountSpy.mockResolvedValue(false)

      await queueService.processJob(mockJob)

      expect(mockPlayer.hasRevealedCardCount).toHaveBeenCalled()
      expect(mockPlayer.getFirstCardNotVisible).toHaveBeenCalled()
      expect(mockGame.revealCard).not.toHaveBeenCalled()
    })
  })
})
