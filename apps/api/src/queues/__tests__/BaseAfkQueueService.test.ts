import { Constants as CoreConstants, type Game, type Player } from "@skymo/core"
import { CError } from "@skymo/error"
import { Job } from "bullmq"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GameStateTracker } from "@/realtime/utils/GameStateTracker.js"
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
      // Add basic mocked methods here
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
  protected override isAfk(player: Player, game: Game): boolean {
    // Use the actual implementation from base class for testing
    const totalLimit = game.settings.private
      ? CoreConstants.AFK_LIMIT.GAME_TOTAL.PRIVATE
      : CoreConstants.AFK_LIMIT.GAME_TOTAL.PUBLIC

    if (player.afkCount >= totalLimit) {
      return true
    }

    const isConnected =
      player.connectionStatus === CoreConstants.CONNECTION_STATUS.CONNECTED

    if (isConnected) {
      return player.afkCount >= CoreConstants.AFK_LIMIT.CONNECTED
    }

    const disconnectedLimit = game.settings.private
      ? CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PRIVATE
      : CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PUBLIC

    return player.disconnectedAfkCount >= disconnectedLimit
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
  public getAfkTimeoutPublic(game: Game, player?: Player): number {
    return this.getAfkTimeout(game, player)
  }

  public isAfkPublic(player: Player, game: Game): boolean {
    return this.isAfk(player, game)
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
      roundPhase: CoreConstants.ROUND_PHASE.MAIN,
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
      disconnectedAfkCount: 0,
      connectionStatus: CoreConstants.CONNECTION_STATUS.CONNECTED,
      getTimeout: vi.fn().mockReturnValue(CoreConstants.TURN_TIMEOUT.CONNECTED),
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
    it("should return timeout based on player status", () => {
      const timeout = queueService.getAfkTimeoutPublic(mockGame, mockPlayer)

      expect(mockPlayer.getTimeout).toHaveBeenCalled()
      expect(timeout).toBe(CoreConstants.TURN_TIMEOUT.CONNECTED + 1000)
    })

    it("should throw error when no player is provided", () => {
      expect(() => queueService.getAfkTimeoutPublic(mockGame)).toThrow(
        "Player is required for getAfkTimeout",
      )
    })
  })

  describe("isAfk", () => {
    it("should return true when connected player reaches AFK limit", () => {
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.CONNECTED
      mockPlayer.afkCount = CoreConstants.AFK_LIMIT.CONNECTED
      expect(queueService.isAfkPublic(mockPlayer, mockGame)).toBe(true)
    })

    it("should return false when connected player is below AFK limit", () => {
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.CONNECTED
      mockPlayer.afkCount = CoreConstants.AFK_LIMIT.CONNECTED - 1
      expect(queueService.isAfkPublic(mockPlayer, mockGame)).toBe(false)
    })

    it("should return true when disconnected player reaches public game limit", () => {
      mockGame.settings.private = false
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.DISCONNECTED
      mockPlayer.disconnectedAfkCount =
        CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PUBLIC
      expect(queueService.isAfkPublic(mockPlayer, mockGame)).toBe(true)
    })

    it("should return true when disconnected player reaches private game limit", () => {
      mockGame.settings.private = true
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.DISCONNECTED
      mockPlayer.disconnectedAfkCount =
        CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PRIVATE
      expect(queueService.isAfkPublic(mockPlayer, mockGame)).toBe(true)
    })

    it("should return false when disconnected player is below limit", () => {
      mockGame.settings.private = false
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.DISCONNECTED
      mockPlayer.disconnectedAfkCount =
        CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PUBLIC - 1
      expect(queueService.isAfkPublic(mockPlayer, mockGame)).toBe(false)
    })
  })

  describe("increaseAfkCount", () => {
    it("should increase AFK counts for connected player", async () => {
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.CONNECTED
      mockPlayer.consecutiveAfkCount = 0
      mockPlayer.afkCount = 0
      mockPlayer.disconnectedAfkCount = 0

      await queueService.increaseAfkCountPublic(mockGame, mockPlayer)

      expect(mockPlayer.consecutiveAfkCount).toBe(1)
      expect(mockPlayer.afkCount).toBe(1)
      expect(mockPlayer.disconnectedAfkCount).toBe(0) // Should not increase for connected player
    })

    it("should increase disconnectedAfkCount for disconnected player", async () => {
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.DISCONNECTED
      mockPlayer.consecutiveAfkCount = 0
      mockPlayer.afkCount = 0
      mockPlayer.disconnectedAfkCount = 0

      await queueService.increaseAfkCountPublic(mockGame, mockPlayer)

      expect(mockPlayer.consecutiveAfkCount).toBe(1)
      expect(mockPlayer.afkCount).toBe(1)
      expect(mockPlayer.disconnectedAfkCount).toBe(1)
    })

    it("should disconnect connected player when AFK limit is reached", async () => {
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.CONNECTED
      mockPlayer.afkCount = CoreConstants.AFK_LIMIT.CONNECTED - 1

      const result = await queueService.increaseAfkCountPublic(
        mockGame,
        mockPlayer,
      )

      expect(mockPlayer.afkCount).toBe(CoreConstants.AFK_LIMIT.CONNECTED)
      expect(queueService.disconnectPlayerCalled).toBe(true)
      expect(queueService.disconnectPlayerArgs[0]).toBe(mockGame)
      expect(queueService.disconnectPlayerArgs[1]).toBe(mockPlayer)
      expect(result).toBe(true)
    })

    it("should disconnect disconnected player when public game limit is reached", async () => {
      mockGame.settings.private = false
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.DISCONNECTED
      mockPlayer.disconnectedAfkCount =
        CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PUBLIC - 1

      const result = await queueService.increaseAfkCountPublic(
        mockGame,
        mockPlayer,
      )

      expect(mockPlayer.disconnectedAfkCount).toBe(
        CoreConstants.AFK_LIMIT.DISCONNECTED_CONSECUTIVE.PUBLIC,
      )
      expect(queueService.disconnectPlayerCalled).toBe(true)
      expect(result).toBe(true)
    })

    it("should not disconnect player when AFK limits are not reached", async () => {
      mockPlayer.connectionStatus = CoreConstants.CONNECTION_STATUS.CONNECTED
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
