import { GameStateTracker } from "@/socketio/utils/GameStateTracker.js"
import { type Game, type Player } from "@skymo/core"
import { Constants as CoreConstants } from "@skymo/core"
import { CError } from "@skymo/error"
import { Job } from "bullmq"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { type AfkJobData, BaseAfkQueueService } from "../BaseAfkQueueService.js"

// Mock other queue services to prevent initialization
vi.mock("../RevealCardsAfkQueueService.js", () => ({
  RevealCardsAfkQueueService: {
    getInstance: vi.fn(),
    exists: vi.fn().mockReturnValue(false),
    instance: undefined,
  },
}))

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

vi.mock("@/socketio/utils/SocketManager.js", () => ({
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

vi.mock("@/socketio/utils/GameOperationManager.js", () => ({
  GameOperationManager: {
    getInstance: vi.fn().mockReturnValue({
      // Add basic mocked methods here
      updateGame: vi.fn(),
      removeGame: vi.fn(),
    }),
  },
}))

vi.mock("@/socketio/utils/GameStateTracker.js", () => ({
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

// Extend interface for testing
interface TestAfkJobData extends AfkJobData {
  testField: string
}

// Concrete implementation of BaseAfkQueueService for testing
class TestAfkQueueService extends BaseAfkQueueService<TestAfkJobData> {
  // For tracking test calls
  disconnectPlayerCalled = false
  disconnectPlayerArgs: any[] = []

  constructor() {
    super("test-afk-queue")
  }

  async processJob(_job: Job<TestAfkJobData>): Promise<void> {
    // Implementation for testing
    return Promise.resolve()
  }

  // Override with test implementations
  protected override isAfk(player: Player): boolean {
    // This will allow us to control the behavior in tests
    return (
      player.consecutiveAfkCount >= CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE ||
      player.afkCount >= CoreConstants.AFK_TIMEOUT.MAX_TOTAL
    )
  }

  // Override for testing
  protected override async disconnectPlayer(
    game: Game,
    player: Player,
  ): Promise<void> {
    this.disconnectPlayerCalled = true
    this.disconnectPlayerArgs = [game, player]
    return Promise.resolve()
  }

  // Expose protected methods for testing
  public getAfkTimeoutPublic(game: Game): number {
    return this.getAfkTimeout(game)
  }

  public isAfkPublic(player: Player): boolean {
    return this.isAfk(player)
  }

  public async increaseAfkCountPublic(
    game: Game,
    player: Player,
  ): Promise<boolean> {
    return this.increaseAfkCount(game, player)
  }

  public warnPlayerPublic(player: Player): void {
    return this.warnPlayer(player)
  }

  public async disconnectPlayerPublic(
    game: Game,
    player: Player,
  ): Promise<void> {
    return this.disconnectPlayer(game, player)
  }

  public async getGamePublic(gameCode: string): Promise<Game> {
    return this.getGame(gameCode)
  }

  public async updateAndSendGamePublic(
    game: Game,
    stateManager: GameStateTracker,
  ): Promise<void> {
    return this.updateAndSendGame(game, stateManager)
  }

  public async lockGamePublic(game: Game): Promise<void> {
    return this.lockGame(game)
  }

  public async unlockGamePublic(game: Game): Promise<void> {
    return this.unlockGame(game)
  }

  // Expose protected properties for testing
  public getSocketManager() {
    return this.socketManager
  }

  public getRedis() {
    return this.redis
  }
}

describe("BaseAfkQueueService", () => {
  let queueService: TestAfkQueueService
  let mockGame: Game
  let mockPlayer: Player

  beforeEach(() => {
    queueService = new TestAfkQueueService()

    // Create mock game and player
    mockGame = {
      code: "test-game",
      settings: {
        private: false,
      },
      processingAfk: false,
      disconnectPlayer: vi.fn().mockResolvedValue(undefined),
      setOperationManager: vi.fn(),
    } as unknown as Game

    mockPlayer = {
      id: "player-123",
      name: "Test Player",
      socketId: "socket-123",
      afkCount: 0,
      consecutiveAfkCount: 0,
    } as unknown as Player

    vi.clearAllMocks()

    // Reset test tracking
    queueService.disconnectPlayerCalled = false
    queueService.disconnectPlayerArgs = []
  })

  afterEach(async () => {
    await queueService.cleanup()
  })

  describe("getAfkTimeout", () => {
    it("should return public timeout for public games", () => {
      mockGame.settings.private = false
      const timeout = queueService.getAfkTimeoutPublic(mockGame)

      expect(timeout).toBe(CoreConstants.AFK_TIMEOUT.PUBLIC + 1000)
    })

    it("should return private timeout for private games", () => {
      mockGame.settings.private = true
      const timeout = queueService.getAfkTimeoutPublic(mockGame)

      expect(timeout).toBe(CoreConstants.AFK_TIMEOUT.PRIVATE + 1000)
    })
  })

  describe("isAfk", () => {
    it("should return true when consecutive AFK count is at limit", () => {
      mockPlayer.consecutiveAfkCount = CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE
      expect(queueService.isAfkPublic(mockPlayer)).toBe(true)
    })

    it("should return true when total AFK count is at limit", () => {
      mockPlayer.afkCount = CoreConstants.AFK_TIMEOUT.MAX_TOTAL
      expect(queueService.isAfkPublic(mockPlayer)).toBe(true)
    })

    it("should return false when AFK counts are below limits", () => {
      mockPlayer.consecutiveAfkCount =
        CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE - 1
      mockPlayer.afkCount = CoreConstants.AFK_TIMEOUT.MAX_TOTAL - 1
      expect(queueService.isAfkPublic(mockPlayer)).toBe(false)
    })
  })

  describe("increaseAfkCount", () => {
    it("should increase AFK counts", async () => {
      mockPlayer.consecutiveAfkCount = 0
      mockPlayer.afkCount = 0

      await queueService.increaseAfkCountPublic(mockGame, mockPlayer)

      expect(mockPlayer.consecutiveAfkCount).toBe(1)
      expect(mockPlayer.afkCount).toBe(1)
    })

    it("should disconnect player when AFK limits are reached", async () => {
      // Mock the isAfk method to return true when called
      const isAfkSpy = vi.spyOn(queueService, "isAfkPublic")
      isAfkSpy.mockImplementation((player) => {
        // Return true after the counts are incremented
        return (
          player.consecutiveAfkCount >=
          CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE
        )
      })

      // Set player just below the limit
      mockPlayer.consecutiveAfkCount =
        CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE - 1

      const result = await queueService.increaseAfkCountPublic(
        mockGame,
        mockPlayer,
      )

      // First check the counts were incremented
      expect(mockPlayer.consecutiveAfkCount).toBe(
        CoreConstants.AFK_TIMEOUT.MAX_CONSECUTIVE,
      )
      expect(mockPlayer.afkCount).toBe(1)

      // Then verify disconnectPlayer was called using our instance properties
      expect(queueService.disconnectPlayerCalled).toBe(true)
      expect(queueService.disconnectPlayerArgs[0]).toBe(mockGame)
      expect(queueService.disconnectPlayerArgs[1]).toBe(mockPlayer)
      expect(result).toBe(true)

      // Clean up spy
      isAfkSpy.mockRestore()
    })

    it("should not disconnect player when AFK limits are not reached", async () => {
      // Set player well below the limit
      mockPlayer.consecutiveAfkCount = 0
      mockPlayer.afkCount = 0

      const result = await queueService.increaseAfkCountPublic(
        mockGame,
        mockPlayer,
      )

      expect(queueService.disconnectPlayerCalled).toBe(false)
      expect(result).toBe(false)
    })
  })

  describe("warnPlayer", () => {
    it("should send warning to player", () => {
      const mockSocket = {
        volatile: {
          emit: vi.fn(),
        },
      }
      queueService.getSocketManager().getSocket = vi
        .fn()
        .mockReturnValue(mockSocket)

      queueService.warnPlayerPublic(mockPlayer)

      expect(queueService.getSocketManager().getSocket).toHaveBeenCalledWith(
        mockPlayer.socketId,
      )
      expect(mockSocket.volatile.emit).toHaveBeenCalledWith("kick:afk-warning")
    })
  })

  describe("disconnectPlayer", () => {
    it("should disconnect player and notify room", async () => {
      // Create a special test implementation with a non-overridden disconnectPlayer
      class SpecialTestService extends BaseAfkQueueService<TestAfkJobData> {
        constructor() {
          super("special-test-queue")
        }

        async processJob(_job: Job<TestAfkJobData>): Promise<void> {
          return Promise.resolve()
        }

        // Expose method for testing
        public async testDisconnectPlayer(
          game: Game,
          player: Player,
        ): Promise<void> {
          return this.disconnectPlayer(game, player)
        }

        // Other required getters for test verification
        public getSocketManager() {
          return this.socketManager
        }

        public getRedis() {
          return this.redis
        }
      }

      // Create an instance of our special test service
      const specialService = new SpecialTestService()

      // Setup the mocks for this test
      const sendToSocketMock = vi.fn()
      const sendToRoomMock = vi.fn()
      specialService.getSocketManager().sendToSocket = sendToSocketMock
      specialService.getSocketManager().sendToRoom = sendToRoomMock
      const updateGameMock = vi.fn().mockResolvedValue(undefined)
      specialService.getRedis().updateGame = updateGameMock

      // Reset the mock function to ensure it's properly tracked
      vi.mocked(mockGame.disconnectPlayer).mockClear()

      // Call the method under test using our public method
      await specialService.testDisconnectPlayer(mockGame, mockPlayer)

      // Verify the expected behaviors
      expect(mockGame.disconnectPlayer).toHaveBeenCalledWith(mockPlayer)
      expect(GameStateTracker).toHaveBeenCalledWith(mockGame)
      expect(sendToSocketMock).toHaveBeenCalled()
      expect(sendToRoomMock).toHaveBeenCalledWith({
        room: mockGame.code,
        event: "kick:player-afk",
        data: [mockPlayer.name],
      })
      expect(updateGameMock).toHaveBeenCalledWith(mockGame, {
        test: "operations",
      })
    })
  })

  describe("lockGame and unlockGame", () => {
    it("should lock game for processing", async () => {
      await queueService.lockGamePublic(mockGame)

      expect(mockGame.processingAfk).toBe(true)
      expect(queueService.getRedis().updateGame).toHaveBeenCalledWith(mockGame)
    })

    it("should throw error when game is already processing", async () => {
      mockGame.processingAfk = true

      await expect(queueService.lockGamePublic(mockGame)).rejects.toThrow(
        CError,
      )
    })

    it("should unlock game after processing", async () => {
      mockGame.processingAfk = true

      await queueService.unlockGamePublic(mockGame)

      expect(mockGame.processingAfk).toBe(false)
      expect(queueService.getRedis().updateGame).toHaveBeenCalledWith(mockGame)
    })
  })
})
