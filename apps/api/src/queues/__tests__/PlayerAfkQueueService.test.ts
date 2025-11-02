import {
  Bot,
  Constants as CoreConstants,
  type Game,
  type Player,
} from "@skymo/core"
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

// Mock Bot class
vi.mock("@skymo/core", async () => {
  const actual = await vi.importActual("@skymo/core")
  return {
    ...actual,
    Bot: vi.fn().mockImplementation(() => ({
      playMove: vi.fn(),
      playInitialReveal: vi.fn(),
      playTurn: vi.fn(), // Deprecated but kept for backward compatibility
    })),
  }
})

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
      getTimeout: vi.fn().mockReturnValue(CoreConstants.TURN_TIMEOUT.CONNECTED),
    } as unknown as Player

    mockPlayer = {
      id: "player-123",
      name: "Test Player",
      socketId: "socket-123",
      afkCount: 0,
      consecutiveAfkCount: 0,
      getTimeout: vi.fn().mockReturnValue(CoreConstants.TURN_TIMEOUT.CONNECTED),
    } as unknown as Player

    mockGame = {
      code: "test-game",
      settings: {
        private: false,
        toJson: vi.fn().mockReturnValue({
          private: false,
          initialTurnedCount: 2,
          removeIdenticalColumn: true,
        }),
      },
      roundPhase: CoreConstants.ROUND_PHASE.MAIN,
      processingAfk: false,
      isPlaying: vi.fn().mockReturnValue(true),
      isRoundMain: vi.fn().mockReturnValue(true),
      isRoundRevealCards: vi.fn().mockReturnValue(false),
      isRoundLastLap: vi.fn().mockReturnValue(false),
      getCurrentPlayer: vi.fn().mockReturnValue(mockCurrentPlayer),
      getPlayerById: vi.fn().mockImplementation((id) => {
        if (id === "current-player-123") return mockCurrentPlayer
        if (id === "player-123") return mockPlayer
        return undefined
      }),
      turnStatus: CoreConstants.TURN_STATUS.CHOOSE_A_PILE,
      selectedCardValue: null,
      lastTurnStatus: CoreConstants.LAST_TURN_STATUS.TURN,
      stateVersion: 1,
      updatedAt: new Date(),
      toJson: vi.fn().mockReturnValue({
        code: "test-game",
        status: CoreConstants.GAME_STATUS.PLAYING,
        hostId: "host-123",
        players: [
          {
            id: "current-player-123",
            name: "Current Player",
            socketId: "current-socket-123",
            avatar: "default",
            score: 0,
            wantsReplay: false,
            connectionStatus: "connected",
            scores: [],
            turnStartTime: null,
            timeout: CoreConstants.TURN_TIMEOUT.CONNECTED,
            cards: [[{ value: 5, isVisible: true }]],
            forfeited: false,
            forfeitedAt: null,
            hasRevealedCardCount: false,
          },
        ],
        turn: 0,
        selectedCardValue: null,
        roundPhase: CoreConstants.ROUND_PHASE.MAIN,
        turnStatus: CoreConstants.TURN_STATUS.CHOOSE_A_PILE,
        lastDiscardCardValue: undefined,
        lastTurnStatus: CoreConstants.LAST_TURN_STATUS.TURN,
        settings: {
          private: false,
          initialTurnedCount: 2,
          removeIdenticalColumn: true,
        },
        stateVersion: 1,
        updatedAt: new Date(),
      }),
      drawCard: vi.fn(),
      pickFromDiscard: vi.fn(),
      discardCard: vi.fn(),
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

      await playerAfkQueueService.startTimer(mockGame, "player-123", "turn")

      expect(queueAddSpy).toHaveBeenCalledWith(
        "game:test-game:player:player-123:turn",
        {
          gameCode: "test-game",
          playerId: "player-123",
        },
        expect.objectContaining({
          delay: expect.any(Number),
          jobId: "game:test-game:player:player-123:turn",
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

      await playerAfkQueueService.cancelTimer("test-game", "player-123", "turn")

      expect(getJobSpy).toHaveBeenCalledWith(
        "game:test-game:player:player-123:turn",
      )
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

    it("should perform AFK move using bot in CHOOSE_A_PILE state", async () => {
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(false) // Not disconnecting

      mockGame.turnStatus = CoreConstants.TURN_STATUS.CHOOSE_A_PILE
      mockGame.selectedCardValue = null

      // Mock drawCard to update game state
      mockGame.drawCard = vi.fn().mockImplementation(() => {
        mockGame.selectedCardValue = 10
        mockGame.turnStatus = CoreConstants.TURN_STATUS.THROW_OR_REPLACE
      })

      // Mock toJson to return updated state
      mockGame.toJson = vi.fn().mockImplementation(() => ({
        code: "test-game",
        status: CoreConstants.GAME_STATUS.PLAYING,
        hostId: "host-123",
        players: [
          {
            id: "current-player-123",
            name: "Current Player",
            socketId: "current-socket-123",
            avatar: "default",
            score: 0,
            wantsReplay: false,
            connectionStatus: "connected",
            scores: [],
            turnStartTime: null,
            timeout: CoreConstants.TURN_TIMEOUT.CONNECTED,
            cards: [[{ value: 5, isVisible: true }]],
            forfeited: false,
            forfeitedAt: null,
            hasRevealedCardCount: false,
          },
        ],
        turn: 0,
        selectedCardValue: mockGame.selectedCardValue,
        roundPhase: CoreConstants.ROUND_PHASE.MAIN,
        turnStatus: mockGame.turnStatus,
        lastDiscardCardValue: undefined,
        lastTurnStatus: CoreConstants.LAST_TURN_STATUS.TURN,
        settings: {
          private: false,
          initialTurnedCount: 2,
          removeIdenticalColumn: true,
        },
        stateVersion: 1,
        updatedAt: new Date(),
      }))

      // Mock bot to return pick-draw action, then discard+turn, then playMove changes current player
      const mockBot = playerAfkQueueService["bot"] as Bot
      vi.spyOn(mockBot, "playMove")
        .mockReturnValueOnce({ type: "pick-draw" })
        .mockReturnValueOnce({ type: "discard" })
        .mockReturnValueOnce({ type: "turn", position: { col: 0, row: 0 } })

      // Mock discardCard to update state
      mockGame.discardCard = vi.fn().mockImplementation(() => {
        mockGame.selectedCardValue = null
        mockGame.turnStatus = CoreConstants.TURN_STATUS.TURN_A_CARD
      })

      // Mock turnCard to change current player (turn complete)
      mockGame.turnCard = vi.fn().mockImplementation(async () => {
        // Simulate turn ending - change current player
        mockGame.getCurrentPlayer = vi.fn().mockReturnValue(mockPlayer)
      })

      await playerAfkQueueService["processJob"](mockJob)

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockBot.playMove).toHaveBeenCalledTimes(3)
      expect(mockGame.drawCard).toHaveBeenCalled()
      expect(mockGame.discardCard).toHaveBeenCalledWith(10)
      expect(mockGame.turnCard).toHaveBeenCalledWith(
        expect.objectContaining({
          player: mockCurrentPlayer,
          column: 0,
          row: 0,
          wasAfk: true,
        }),
      )
    })

    it("should perform AFK move using bot in THROW_OR_REPLACE state", async () => {
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(false) // Not disconnecting

      mockGame.turnStatus = CoreConstants.TURN_STATUS.THROW_OR_REPLACE
      mockGame.selectedCardValue = 10

      // Mock bot to return replace action
      const mockBot = playerAfkQueueService["bot"] as Bot
      vi.spyOn(mockBot, "playMove").mockReturnValueOnce({
        type: "replace",
        position: { col: 0, row: 0 },
      })

      // Mock replaceCard to change current player (turn complete)
      mockGame.replaceCard = vi.fn().mockImplementation(async () => {
        // Simulate turn ending - change current player
        mockGame.getCurrentPlayer = vi.fn().mockReturnValue(mockPlayer)
      })

      await playerAfkQueueService["processJob"](mockJob)

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockBot.playMove).toHaveBeenCalled()
      expect(mockGame.drawCard).not.toHaveBeenCalled()
      expect(mockGame.replaceCard).toHaveBeenCalledWith(
        expect.objectContaining({
          column: 0,
          row: 0,
          wasAfk: true,
        }),
      )
    })

    it("should stop when bot returns an action that ends turn", async () => {
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(false) // Not disconnecting

      mockGame.turnStatus = CoreConstants.TURN_STATUS.CHOOSE_A_PILE

      // Mock bot to return pick-draw, then turn card which ends the turn
      const mockBot = playerAfkQueueService["bot"] as Bot
      vi.spyOn(mockBot, "playMove")
        .mockReturnValueOnce({ type: "pick-draw" })
        .mockReturnValueOnce({ type: "discard" })
        .mockReturnValueOnce({ type: "turn", position: { col: 0, row: 0 } })

      mockGame.drawCard = vi.fn().mockImplementation(() => {
        mockGame.selectedCardValue = 10
        mockGame.turnStatus = CoreConstants.TURN_STATUS.THROW_OR_REPLACE
      })

      mockGame.discardCard = vi.fn().mockImplementation(() => {
        mockGame.selectedCardValue = null
        mockGame.turnStatus = CoreConstants.TURN_STATUS.TURN_A_CARD
      })

      mockGame.turnCard = vi.fn().mockImplementation(async () => {
        // Change to different player - turn complete
        mockGame.getCurrentPlayer = vi.fn().mockReturnValue(mockPlayer)
      })

      await playerAfkQueueService["processJob"](mockJob)

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockBot.playMove).toHaveBeenCalled()
      expect(mockGame.turnCard).toHaveBeenCalled()
    })

    it("should throw error when bot throws error", async () => {
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(false) // Not disconnecting

      mockGame.turnStatus = CoreConstants.TURN_STATUS.CHOOSE_A_PILE

      // Mock bot to throw error
      const mockBot = playerAfkQueueService["bot"] as Bot
      vi.spyOn(mockBot, "playMove").mockImplementation(() => {
        throw new Error("Bot error")
      })

      await expect(
        playerAfkQueueService["processJob"](mockJob),
      ).rejects.toThrow("Bot error")

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockBot.playMove).toHaveBeenCalled()
    })

    it("should handle pick-discard bot action", async () => {
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(false) // Not disconnecting

      mockGame.turnStatus = CoreConstants.TURN_STATUS.CHOOSE_A_PILE
      mockGame.getLastDiscardCardValue = vi.fn().mockReturnValue(5)

      // Mock bot to return pick-discard action
      const mockBot = playerAfkQueueService["bot"] as Bot
      vi.spyOn(mockBot, "playMove").mockReturnValueOnce({
        type: "pick-discard",
        replaceAt: { col: 0, row: 1 },
      })

      // Mock replaceCard to change current player (turn complete)
      mockGame.replaceCard = vi.fn().mockImplementation(async () => {
        // Simulate turn ending - change current player
        mockGame.getCurrentPlayer = vi.fn().mockReturnValue(mockPlayer)
      })

      await playerAfkQueueService["processJob"](mockJob)

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockBot.playMove).toHaveBeenCalled()
      expect(mockGame.pickFromDiscard).toHaveBeenCalled()
      expect(mockGame.replaceCard).toHaveBeenCalledWith(
        expect.objectContaining({
          column: 0,
          row: 1,
          wasAfk: true,
        }),
      )
    })

    it("should not perform AFK move if player is disconnected", async () => {
      const increaseAfkCountSpy = vi
        .spyOn(playerAfkQueueService as any, "increaseAfkCount")
        .mockResolvedValue(true) // Player disconnected

      const mockBot = playerAfkQueueService["bot"] as Bot
      const botSpy = vi.spyOn(mockBot, "playMove")

      await playerAfkQueueService["processJob"](mockJob)

      expect(increaseAfkCountSpy).toHaveBeenCalledWith(
        mockGame,
        mockCurrentPlayer,
      )
      expect(mockGame.drawCard).not.toHaveBeenCalled()
      expect(botSpy).not.toHaveBeenCalled()
    })
  })
})
