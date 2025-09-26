import { Constants as CoreConstants, Game, Player, Settings } from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { AuthenticatedGameSocket } from "@/realtime/types/gameSocket.js"
import { LobbyService } from "../lobby.service.js"

describe("LobbyService - Concurrent Join Protection", () => {
  let service: LobbyService
  let socket1: AuthenticatedGameSocket
  let socket2: AuthenticatedGameSocket
  let mockRedis: any
  let mockSocketManager: any

  beforeEach(() => {
    // Create service instance
    service = new LobbyService()

    // Setup mock Redis
    mockRedis = {
      getGame: vi.fn(),
      updateGame: vi.fn(),
      createGame: vi.fn(),
    }

    // Setup mock SocketManager
    mockSocketManager = {
      sendToRoom: vi.fn(),
      sendToSocket: vi.fn(),
    }

    // Inject mocks
    service["redis"] = mockRedis
    service["socketManager"] = mockSocketManager

    // Setup mock sockets
    socket1 = {
      id: "socket1",
      data: { playerId: "player1", gameCode: "test123" },
      join: vi.fn(),
      emit: vi.fn(),
      user: { id: 1, username: "user1" },
    } as any

    socket2 = {
      id: "socket2",
      data: { playerId: "player2", gameCode: "test123" },
      join: vi.fn(),
      emit: vi.fn(),
      user: { id: 2, username: "user2" },
    } as any
  })

  it("should prevent concurrent joins from exceeding max players", async () => {
    // Create a game with max 2 players and 1 already joined
    const game = new Game({
      hostId: "host123",
      settings: new Settings(true, 2), // Private game, max 2 players
    })
    game.code = "test123"
    game.stateVersion = 1

    // Add first player
    const existingPlayer = new Player(
      { name: "Host", avatar: CoreConstants.AVATARS.DOG },
      "hostSocket",
      3,
      "host",
    )
    game.addPlayer(existingPlayer)

    // Mock Redis to return the game
    mockRedis.getGame.mockResolvedValue(game)

    // Simulate version mismatch on first attempt (concurrent modification)
    let updateAttempt = 0
    mockRedis.updateGame.mockImplementation(
      async (gameToUpdate: Game, operation: any, expectedVersion?: number) => {
        updateAttempt++

        // First attempt for player2 fails due to version mismatch
        if (updateAttempt === 2 && expectedVersion === 1) {
          throw new CError("Version mismatch", {
            code: ErrorConstants.ERROR.VERSION_MISMATCH,
            level: "info",
          })
        }

        // Update version on successful updates
        gameToUpdate.stateVersion++
      },
    )

    // Create two players trying to join
    const player1 = { name: "Player1", avatar: CoreConstants.AVATARS.ELEPHANT }
    const player2 = { name: "Player2", avatar: CoreConstants.AVATARS.CAT }

    // Simulate concurrent joins
    const join1Promise = service.onJoin(socket1, "test123", player1)
    const join2Promise = service.onJoin(socket2, "test123", player2)

    // One should succeed, one should fail
    const results = await Promise.allSettled([join1Promise, join2Promise])

    const successCount = results.filter((r) => r.status === "fulfilled").length
    const failureCount = results.filter((r) => r.status === "rejected").length

    // Exactly one should succeed and one should fail
    expect(successCount).toBe(1)
    expect(failureCount).toBe(1)

    // Check the failure reason
    const failedResult = results.find(
      (r) => r.status === "rejected",
    ) as PromiseRejectedResult
    expect(failedResult.reason.code).toBe(ErrorConstants.ERROR.GAME_IS_FULL)
  })

  it("should successfully retry on version mismatch and join if space available", async () => {
    // Create a game with max 3 players and 1 already joined
    const game = new Game({
      hostId: "host123",
      settings: new Settings(true, 3), // Private game, max 3 players
    })
    game.code = "test123"
    game.stateVersion = 1

    // Add first player
    const existingPlayer = new Player(
      { name: "Host", avatar: CoreConstants.AVATARS.DOG },
      "hostSocket",
      3,
      "host",
    )
    game.addPlayer(existingPlayer)

    // Track getGame calls
    let getGameCallCount = 0
    mockRedis.getGame.mockImplementation(async () => {
      getGameCallCount++

      // On retry (second call), return game with updated player count
      if (getGameCallCount === 2) {
        const updatedGame = new Game({
          hostId: "host123",
          settings: new Settings(true, 3),
        })
        updatedGame.code = "test123"
        updatedGame.stateVersion = 2
        updatedGame.addPlayer(existingPlayer)

        // Add the first player who succeeded
        const firstJoinedPlayer = new Player(
          { name: "Player1", avatar: CoreConstants.AVATARS.ELEPHANT },
          "socket1",
          1,
          "user1",
        )
        updatedGame.addPlayer(firstJoinedPlayer)

        return updatedGame
      }

      return game
    })

    // Simulate version mismatch on first attempt
    let updateCallCount = 0
    mockRedis.updateGame.mockImplementation(
      async (gameToUpdate: Game, operation: any, expectedVersion?: number) => {
        updateCallCount++

        // First attempt fails with version mismatch
        if (updateCallCount === 1 && expectedVersion === 1) {
          throw new CError("Version mismatch", {
            code: ErrorConstants.ERROR.VERSION_MISMATCH,
            level: "info",
          })
        }

        // Second attempt succeeds
        gameToUpdate.stateVersion++
      },
    )

    const player2 = { name: "Player2", avatar: CoreConstants.AVATARS.CAT }

    // Should succeed after retry
    await expect(
      service.onJoin(socket2, "test123", player2),
    ).resolves.not.toThrow()

    // Verify retry happened (getGame called twice)
    expect(getGameCallCount).toBe(2)

    // Verify update was called at least twice (once failed, then succeeded)
    expect(updateCallCount).toBeGreaterThanOrEqual(2)
  })
})
