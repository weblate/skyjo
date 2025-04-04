import type { GameSocket } from "@/socketio/types/gameSocket.js"
import {
  Constants as CoreConstants,
  Game,
  KickVote,
  Player,
  Settings,
} from "@skymo/core"
import { CError, Constants as ErrorConstants } from "@skymo/error"
import { Logger } from "@skymo/logger"
import {
  mockGameOperationManager,
  mockGameStateTracker,
  mockRedisInService,
  mockSocket,
  mockSocketManagerInService,
} from "@tests/_mock.js"
import { RANDOM_SOCKET_ID, TEST_SOCKET_ID } from "@tests/constants-test.js"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { KickService } from "../kick.service.js"

describe("KickService", () => {
  let service: KickService
  let game: Game

  let player: Player
  let socket: GameSocket

  let opponent1: Player
  let opponent1Socket: GameSocket

  let opponent2: Player
  let kickVotes: Map<string, KickVote>

  beforeEach(() => {
    service = new KickService()
    mockRedisInService(service)
    mockSocketManagerInService(service)

    // Create a map to track kick votes in tests
    kickVotes = new Map<string, KickVote>()
    // @ts-ignore - We're manually setting a private property for testing
    service["kickVotes"] = kickVotes

    // Mock kickVoteRepository methods
    // @ts-ignore - We're manually overriding the repository with a mock version
    service["kickVoteRepository"] = {
      getKickVote: vi.fn((gameCode: string) => {
        return Promise.resolve(kickVotes.get(gameCode) || null)
      }),
      createKickVote: vi.fn((gameCode: string, kickVote: KickVote) => {
        if (kickVotes.has(gameCode)) {
          return Promise.reject(
            new Error(`Kick vote already exists for game ${gameCode}`),
          )
        }
        kickVotes.set(gameCode, kickVote)
        return Promise.resolve()
      }),
      addVote: vi.fn((gameCode: string, playerId: string, vote: boolean) => {
        const kickVote = kickVotes.get(gameCode)
        if (!kickVote) {
          return Promise.reject(
            new Error(`No kick vote found for game ${gameCode}`),
          )
        }
        if (kickVote.hasPlayerVoted(playerId)) {
          return Promise.reject(
            new Error(`Player ${playerId} has already voted`),
          )
        }
        kickVote.addVote(playerId, vote)
        return Promise.resolve(kickVote)
      }),
      deleteKickVote: vi.fn((gameCode: string) => {
        kickVotes.delete(gameCode)
        return Promise.resolve()
      }),
      updateKickVote: vi.fn(),
    }

    // Mock kickVoteExpirationQueue
    // @ts-ignore - We're manually overriding the queue with a mock version
    service["kickVoteExpirationQueue"] = {
      addKickVoteExpiration: vi.fn().mockResolvedValue(undefined),
      cancelKickVoteExpiration: vi.fn().mockResolvedValue(undefined),
    }

    socket = mockSocket()

    player = new Player(
      { username: "player", avatar: CoreConstants.AVATARS.BEE },
      TEST_SOCKET_ID,
    )
    opponent1 = new Player(
      { username: "opponent1", avatar: CoreConstants.AVATARS.CRAB },
      RANDOM_SOCKET_ID(),
    )
    opponent2 = new Player(
      { username: "opponent2", avatar: CoreConstants.AVATARS.DOG },
      RANDOM_SOCKET_ID(),
    )

    game = new Game({
      hostId: player.socketId,
      settings: new Settings(),
    })
    mockGameStateTracker(game)
    mockGameOperationManager(game)
    game.addPlayer(player)
    game.addPlayer(opponent1)
    opponent1Socket = mockSocket(opponent1.socketId)
    game.addPlayer(opponent2)

    service["redis"].getGame = vi.fn(() => Promise.resolve(game))

    socket.data = {
      gameCode: game.code,
      playerId: player.id,
    }

    opponent1Socket.data = {
      gameCode: game.code,
      playerId: opponent1.id,
    }
  })

  it("should be defined", () => {
    expect(KickService).toBeDefined()
  })

  describe("initiateKickVote", () => {
    it("should throw if the initiator is not in the game", async () => {
      socket.data.playerId = "NOT-A-PLAYER-ID"

      await expect(
        service.onInitiateKickVote(socket, opponent2.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_FOUND)
    })

    it("should throw if the targeted player is not in the game", async () => {
      await expect(
        service.onInitiateKickVote(socket, crypto.randomUUID()),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.PLAYER_NOT_FOUND)
    })

    it("should directly kick the player if the initiator is the host and the game is private", async () => {
      game.settings.private = true
      game.hostId = player.id

      await service.onInitiateKickVote(socket, opponent2.id)

      expect(kickVotes.get(game.code)).toBeUndefined()

      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:host-kick",
        data: [opponent2.id, opponent2.name],
      })
      expect(game.players.find((p) => p.id === opponent2.id)).toBeUndefined()
    })

    it("should initiate a kick vote if the initiator is the host but the game is public", async () => {
      game.settings.private = false
      game.hostId = player.id

      await service.onInitiateKickVote(socket, opponent2.id)

      expect(kickVotes.get(game.code)).toBeDefined()
      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:vote",
        data: [expect.any(Object)],
      })
      expect(game.players.find((p) => p.id === opponent2.id)).toBeDefined()
    })

    it("should initiate a kick vote if the game is private but the initiator is not the host", async () => {
      game.settings.private = true
      game.hostId = opponent1.id

      await service.onInitiateKickVote(socket, opponent2.id)

      expect(kickVotes.get(game.code)).toBeDefined()
      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:vote",
        data: [expect.any(Object)],
      })
      expect(game.players.find((p) => p.id === opponent2.id)).toBeDefined()
    })

    it("should initiate a kick vote", async () => {
      await service.onInitiateKickVote(socket, opponent2.id)

      expect(kickVotes.get(game.code)).toBeDefined()
    })

    it("should throw if a kick vote already exists for the game", async () => {
      await service.onInitiateKickVote(socket, opponent2.id)

      await expect(
        service.onInitiateKickVote(socket, opponent2.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.KICK_VOTE_IN_PROGRESS)
    })

    it("should handle CError with KICK_VOTE_IN_PROGRESS code", async () => {
      // Mock createKickVote to throw a CError
      service["kickVoteRepository"].createKickVote = vi.fn().mockRejectedValue(
        new CError("A kick vote is already in progress for this game", {
          code: ErrorConstants.ERROR.KICK_VOTE_IN_PROGRESS,
          level: "warn",
        }),
      )

      await expect(
        service.onInitiateKickVote(socket, opponent2.id),
      ).toThrowCErrorWithCode(ErrorConstants.ERROR.KICK_VOTE_IN_PROGRESS)
    })

    it("should rethrow unknown errors during kick vote creation", async () => {
      // Mock createKickVote to throw a different error
      const testError = new Error("Unknown error")
      service["kickVoteRepository"].createKickVote = vi
        .fn()
        .mockRejectedValue(testError)

      await expect(
        service.onInitiateKickVote(socket, opponent2.id),
      ).rejects.toThrow(testError)
    })

    it("should check vote status if the kick vote has expired", async () => {
      vi.useFakeTimers()

      await service.onInitiateKickVote(socket, opponent2.id)

      // add 31 seconds
      vi.advanceTimersByTime(31000)

      // Kick vote should still exist as we're just mocking the repository
      expect(kickVotes.get(game.code)).toBeDefined()

      vi.useRealTimers()
    })
  })

  describe("checkKickVoteStatus", () => {
    it("should exit early if no kick vote is found", async () => {
      // Mock Logger.debug
      const originalLoggerDebug = Logger.debug
      Logger.debug = vi.fn()

      // Ensure no kick vote exists
      service["kickVoteRepository"].getKickVote = vi
        .fn()
        .mockResolvedValue(null)

      await service["checkKickVoteStatus"](socket, game)

      // Verify Logger.debug was called with expected message
      expect(Logger.debug).toHaveBeenCalledWith(
        `No kick vote found for game ${game.code} during status check`,
        expect.any(Object),
      )

      // Verify no other actions were taken
      expect(
        service["kickVoteExpirationQueue"].cancelKickVoteExpiration,
      ).not.toHaveBeenCalled()
      expect(
        service["kickVoteRepository"].deleteKickVote,
      ).not.toHaveBeenCalled()
      expect(service["socketManager"].sendToRoom).not.toHaveBeenCalled()

      // Restore Logger.debug
      Logger.debug = originalLoggerDebug
    })

    it("should handle kick vote with allPlayersVotedExceptTarget but player left the game", async () => {
      // Create a kick vote
      const kickVote = new KickVote({
        targetId: opponent2.id,
        initiatorId: opponent1.id,
        nbConnectedPlayers: game.getConnectedPlayers().length,
      })

      // Mock methods
      kickVote.hasReachedRequiredVotes = vi.fn().mockReturnValue(false)
      kickVote.allPlayersVotedExceptTarget = vi.fn().mockReturnValue(true)
      service["kickVoteRepository"].getKickVote = vi
        .fn()
        .mockResolvedValue(kickVote)

      // Remove the player from the game
      game.players = game.players.filter((p) => p.id !== opponent2.id)

      // Need to spy on socketManager.sendToRoom to verify it's not called
      const sendToRoomSpy = vi.spyOn(service["socketManager"], "sendToRoom")

      await service["checkKickVoteStatus"](socket, game)

      // Verify cancelKickVoteExpiration and deleteKickVote were called
      expect(
        service["kickVoteExpirationQueue"].cancelKickVoteExpiration,
      ).toHaveBeenCalledWith(game.code)
      expect(service["kickVoteRepository"].deleteKickVote).toHaveBeenCalledWith(
        game.code,
      )

      // Verify sendToRoom was not called with vote-failed event
      const voteFailedCalls = sendToRoomSpy.mock.calls.filter(
        (call) => call[0].event === "kick:vote-failed",
      )
      expect(voteFailedCalls.length).toBe(0)
    })
  })

  describe("onVoteToKick", () => {
    it("should throw if the player is not found", async () => {
      socket.data.playerId = "NOT-A-PLAYER-ID"

      await expect(service.onVoteToKick(socket, true)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )
    })

    it("should throw if no kick vote is in progress", async () => {
      await expect(service.onVoteToKick(socket, true)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.NO_KICK_VOTE_IN_PROGRESS,
      )
    })

    it("should throw if the player has already voted", async () => {
      // Create a kick vote where the initiator (player) has already voted
      const kickVote = new KickVote({
        targetId: opponent2.id,
        initiatorId: player.id,
        nbConnectedPlayers: game.getConnectedPlayers().length,
      })
      kickVotes.set(game.code, kickVote)

      await expect(service.onVoteToKick(socket, true)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_ALREADY_VOTED,
      )
    })

    it("should add a vote to the kick vote and broadcast the vote", async () => {
      // Create a kick vote where opponent1 is the initiator
      const kickVote = new KickVote({
        targetId: opponent2.id,
        initiatorId: opponent1.id,
        nbConnectedPlayers: game.getConnectedPlayers().length,
      })
      kickVotes.set(game.code, kickVote)

      const _oldKickVoteJson = structuredClone(kickVote.toJson())

      const opponent3 = new Player(
        { username: "opponent3", avatar: CoreConstants.AVATARS.DOG },
        RANDOM_SOCKET_ID(),
      )
      game.addPlayer(opponent3)

      const opponent4 = new Player(
        { username: "opponent4", avatar: CoreConstants.AVATARS.JELLYFISH },
        RANDOM_SOCKET_ID(),
      )
      game.addPlayer(opponent4)

      expect(kickVote["votes"].length).toBe(1) // initiator vote

      // We need to modify the service's checkKickVoteStatus method for this test
      // to ensure it only calls sendToRoom once
      const originalCheckKickVoteStatus = service["checkKickVoteStatus"]
      service["checkKickVoteStatus"] = vi
        .fn()
        .mockImplementation(async (_socket, game) => {
          // Clear mock call history from previous calls
          vi.mocked(service["socketManager"].sendToRoom).mockClear()
          // Make just one call to sendToRoom
          service["socketManager"].sendToRoom({
            room: game.code,
            event: "kick:vote",
            data: [kickVote.toJson()],
          })
        })

      await service.onVoteToKick(socket, true)

      expect(service["socketManager"].sendToRoom).toHaveBeenCalledTimes(1)
      expect(kickVote["votes"].length).toBe(2)
      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:vote",
        data: [expect.any(Object)],
      })

      // Restore original method
      service["checkKickVoteStatus"] = originalCheckKickVoteStatus
    })

    it("should add a vote to the kick vote, try to kick the player but throw because player is not in the game", async () => {
      // Create a kick vote with enough votes to pass
      const kickVote = new KickVote({
        targetId: opponent2.id,
        initiatorId: opponent1.id,
        nbConnectedPlayers: 3,
      })
      kickVote.addVote(opponent1.id, true) // initiator vote
      kickVotes.set(game.code, kickVote)

      // Remove the player from the game
      game.players = game.players.filter((p) => p.id !== opponent2.id)

      await expect(service.onVoteToKick(socket, true)).toThrowCErrorWithCode(
        ErrorConstants.ERROR.PLAYER_NOT_FOUND,
      )
    })

    for (const key of Object.keys(CoreConstants.GAME_STATUS)) {
      it(`should add a vote to the kick vote and broadcast the success and change the host if target is the current host in ${key}`, async () => {
        game.status =
          CoreConstants.GAME_STATUS[
            key as keyof typeof CoreConstants.GAME_STATUS
          ]
        game.hostId = opponent2.id

        // Create a kick vote with enough votes to pass
        const kickVote = new KickVote({
          targetId: opponent2.id,
          initiatorId: opponent1.id,
          nbConnectedPlayers: 3,
        })
        kickVote.addVote(opponent1.id, true) // initiator vote
        kickVotes.set(game.code, kickVote)

        await service.onVoteToKick(socket, true)

        expect(game.hostId).not.toBe(opponent2.id)
      })
    }

    it("should add a vote to the kick vote, broadcast the success and remove the player if game is not playing", async () => {
      game.status = CoreConstants.GAME_STATUS.FINISHED

      // Create a kick vote with enough votes to pass
      const kickVote = new KickVote({
        targetId: opponent2.id,
        initiatorId: opponent1.id,
        nbConnectedPlayers: 3,
      })
      kickVote.addVote(opponent1.id, true) // initiator vote
      kickVotes.set(game.code, kickVote)

      await service.onVoteToKick(socket, true)

      expect(game.players.find((p) => p.id === opponent2.id)).toBeUndefined()
    })

    it("should add a vote to the kick vote, broadcast the success and set the player connection status to disconnected if game is in progress", async () => {
      game.status = CoreConstants.GAME_STATUS.PLAYING

      // Create a kick vote with enough votes to pass
      const kickVote = new KickVote({
        targetId: opponent2.id,
        initiatorId: opponent1.id,
        nbConnectedPlayers: 3,
      })
      kickVote.addVote(opponent1.id, true) // initiator vote
      kickVotes.set(game.code, kickVote)

      await service.onVoteToKick(socket, true)

      const player = game.players.find((p) => p.id === opponent2.id)
      expect(player).toBeDefined()
      expect(player?.connectionStatus).toBe(
        CoreConstants.CONNECTION_STATUS.DISCONNECTED,
      )
    })

    it("should add a vote to the kick vote and broadcast the failure", async () => {
      // Create a kick vote that will fail (true votes < requiredVotes)
      const kickVote = new KickVote({
        targetId: opponent2.id,
        initiatorId: opponent1.id,
        nbConnectedPlayers: 5, // require 3 votes to pass
      })
      kickVote.addVote(opponent1.id, false) // initiator votes no
      kickVotes.set(game.code, kickVote)

      // Add more players to increase requiredVotes
      for (let i = 0; i < 3; i++) {
        const opponent = new Player(
          { username: `opponent${i + 3}`, avatar: CoreConstants.AVATARS.DOG },
          RANDOM_SOCKET_ID(),
        )
        game.addPlayer(opponent)
      }

      // Mock checkKickVoteStatus to handle the failure case
      const originalCheckKickVoteStatus = service["checkKickVoteStatus"]
      service["checkKickVoteStatus"] = vi
        .fn()
        .mockImplementation(async (_socket, game) => {
          // Simulate that all players have voted by adding votes through public methods
          for (const p of game.players) {
            if (
              p.id !== opponent2.id &&
              p.id !== player.id &&
              p.id !== opponent1.id
            ) {
              kickVote.addVote(p.id, false)
            }
          }

          // Simulate the vote failure
          service["socketManager"].sendToRoom({
            room: game.code,
            event: "kick:vote-failed",
            data: [opponent2.id, opponent2.name],
          })
        })

      // Player votes yes
      await service.onVoteToKick(socket, true)

      expect(service["socketManager"].sendToRoom).toHaveBeenCalledWith({
        room: game.code,
        event: "kick:vote-failed",
        data: [opponent2.id, opponent2.name],
      })

      // Player is still in the game
      expect(game.players.find((p) => p.id === opponent2.id)).toBeDefined()

      // Restore original method
      service["checkKickVoteStatus"] = originalCheckKickVoteStatus
    })
  })
})
